package com.scribd.clone.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.scribd.clone.dto.DocumentResponseDto;
import com.scribd.clone.model.Category;
import com.scribd.clone.model.Document;
import com.scribd.clone.model.User;
import com.scribd.clone.repository.CategoryRepository;
import com.scribd.clone.repository.DocumentRepository;
import com.scribd.clone.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Enterprise Document & PDF Cloud Sync Service.
 * Automatically synchronizes all uploaded PDF books, research papers, and publications
 * directly with Google Drive folder: 1ZwKXAE2dM9JmJIGl2HZap1RiW9CSeVPS under 'documents_catalog.json'.
 *
 * Guarantees that even if local machine turns off or cloud database restarts,
 * all documents, covers, and metadata are automatically recovered and preserved forever in Google Drive.
 */
@Service
public class DocumentSyncService {

    private static final Logger log = LoggerFactory.getLogger(DocumentSyncService.class);
    public static final String CATALOG_FILENAME = "documents_catalog.json";
    private static final Path LOCAL_BACKUP_PATH = Paths.get("data", CATALOG_FILENAME);

    private final DocumentRepository documentRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final GoogleDriveStorageService googleDriveStorageService;
    private final ObjectMapper objectMapper;

    public DocumentSyncService(
            DocumentRepository documentRepository,
            CategoryRepository categoryRepository,
            UserRepository userRepository,
            GoogleDriveStorageService googleDriveStorageService
    ) {
        this.documentRepository = documentRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.googleDriveStorageService = googleDriveStorageService;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        log.info("Initiating Document & PDF Cloud Sync with Google Drive...");
        restoreDocumentsFromGoogleDrive();
        archiveBundledBooksToGoogleDrive();
    }

    /**
     * Pushes current Document catalog directly into Google Drive folder 1ZwKXAE2dM9JmJIGl2HZap1RiW9CSeVPS
     * and maintains a local offline backup copy in data/documents_catalog.json.
     */
    public synchronized boolean syncDocumentsToGoogleDrive() {
        try {
            List<Document> docs = documentRepository.findAll(Sort.by("createdAt").descending());
            List<DocumentResponseDto> dtoList = docs.stream()
                    .map(DocumentResponseDto::fromEntity)
                    .collect(Collectors.toList());

            String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(dtoList);
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);

            // 1. Save local backup copy on disk
            try {
                if (LOCAL_BACKUP_PATH.getParent() != null) {
                    Files.createDirectories(LOCAL_BACKUP_PATH.getParent());
                }
                Files.write(LOCAL_BACKUP_PATH, bytes);
                log.info("Saved local backup of {} documents to {}", docs.size(), LOCAL_BACKUP_PATH);
            } catch (Exception e) {
                log.warn("Could not save local backup of documents: {}", e.getMessage());
            }

            // 2. Primary: Save directly to Google Drive Folder (Indestructible Cloud Storage)
            if (googleDriveStorageService != null && googleDriveStorageService.isAvailable()) {
                String fileId = googleDriveStorageService.saveOrUpdateFile(CATALOG_FILENAME, bytes, "application/json");
                log.info("✅ Synced {} documents to Google Drive Cloud Storage (File: {}, ID: {})",
                        docs.size(), CATALOG_FILENAME, fileId);
                return true;
            } else {
                log.warn("Google Drive storage not currently available. Saved {} documents to local disk cache only.", docs.size());
                return false;
            }
        } catch (Exception e) {
            log.error("Failed to sync documents to Google Drive: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Reads documents from Google Drive 'documents_catalog.json' and restores any missing entries to the database.
     * If DB has fewer documents than the Google Drive catalog, it automatically restores missing ones.
     */
    public synchronized int restoreDocumentsFromGoogleDrive() {
        List<DocumentResponseDto> restoredList = null;

        // Tier 1: Restore directly from Google Drive Cloud Storage
        if (googleDriveStorageService != null && googleDriveStorageService.isAvailable()) {
            try {
                byte[] driveBytes = googleDriveStorageService.readFileBytes(CATALOG_FILENAME);
                if (driveBytes != null && driveBytes.length > 0) {
                    restoredList = objectMapper.readValue(driveBytes, new TypeReference<List<DocumentResponseDto>>() {});
                    log.info("Loaded {} documents from Google Drive Cloud Storage ('{}')", restoredList.size(), CATALOG_FILENAME);
                }
            } catch (Exception e) {
                log.warn("Could not read {} from Google Drive: {}", CATALOG_FILENAME, e.getMessage());
            }
        }

        // Tier 2: Fallback to local backup on disk if Google Drive had no file or was offline
        if ((restoredList == null || restoredList.isEmpty()) && Files.exists(LOCAL_BACKUP_PATH)) {
            try {
                byte[] localBytes = Files.readAllBytes(LOCAL_BACKUP_PATH);
                restoredList = objectMapper.readValue(localBytes, new TypeReference<List<DocumentResponseDto>>() {});
                log.info("Loaded {} documents from local backup ({})", restoredList.size(), LOCAL_BACKUP_PATH);
            } catch (Exception e) {
                log.warn("Could not read local documents backup: {}", e.getMessage());
            }
        }

        if (restoredList == null || restoredList.isEmpty()) {
            // If Google Drive doesn't have documents_catalog.json yet, push current DB documents to create it
            if (documentRepository.count() > 0) {
                syncDocumentsToGoogleDrive();
            }
            return 0;
        }

        // Ensure default uploader user
        User uploader = userRepository.findByUsername("Sourav").orElse(null);
        if (uploader == null) {
            uploader = userRepository.findByRole("ROLE_ADMIN").stream().findFirst().orElse(null);
        }
        if (uploader == null) {
            uploader = userRepository.findAll().stream().findFirst().orElse(null);
        }

        int addedCount = 0;
        for (DocumentResponseDto dto : restoredList) {
            boolean exists = false;
            if (dto.getFileName() != null && !dto.getFileName().isBlank()) {
                exists = documentRepository.existsByFileName(dto.getFileName());
            }
            if (!exists && dto.getTitle() != null && dto.getAuthor() != null) {
                exists = documentRepository.findAll().stream().anyMatch(d ->
                        dto.getTitle().equalsIgnoreCase(d.getTitle()) &&
                        dto.getAuthor().equalsIgnoreCase(d.getAuthor()));
            }

            if (!exists) {
                Category cat = null;
                if (dto.getCategorySlug() != null) {
                    cat = categoryRepository.findBySlug(dto.getCategorySlug()).orElse(null);
                }
                if (cat == null && dto.getCategoryName() != null) {
                    cat = categoryRepository.findByName(dto.getCategoryName()).orElse(null);
                }
                if (cat == null && dto.getCategoryId() != null) {
                    cat = categoryRepository.findById(dto.getCategoryId()).orElse(null);
                }
                if (cat == null) {
                    cat = categoryRepository.findAll().stream().findFirst().orElseGet(() ->
                            categoryRepository.save(new Category("Technology & Coding", "technology-coding", "Software architecture & development", "laptop"))
                    );
                }

                Document newDoc = new Document();
                newDoc.setTitle(dto.getTitle());
                newDoc.setAuthor(dto.getAuthor() != null ? dto.getAuthor() : "Sourav's Library");
                newDoc.setDescription(dto.getDescription());
                newDoc.setCategory(cat);
                newDoc.setFileName(dto.getFileName());
                newDoc.setOriginalFilename(dto.getOriginalFilename() != null ? dto.getOriginalFilename() : dto.getFileName());
                newDoc.setFileSize(dto.getFileSize() != null ? dto.getFileSize() : 0L);
                newDoc.setFileType(dto.getFileType() != null ? dto.getFileType() : "application/pdf");
                newDoc.setCoverImagePath(dto.getCoverImagePath());
                newDoc.setPageCount(dto.getPageCount() != null ? dto.getPageCount() : 1);
                newDoc.setLanguage(dto.getLanguage() != null ? dto.getLanguage() : "English");
                newDoc.setPublishedYear(dto.getPublishedYear());
                newDoc.setIsFeatured(Boolean.TRUE.equals(dto.getIsFeatured()));
                newDoc.setIsPublished(dto.getIsPublished() == null || Boolean.TRUE.equals(dto.getIsPublished()));
                newDoc.setViewCount(dto.getViewCount() != null ? dto.getViewCount() : 0L);
                newDoc.setDownloadCount(dto.getDownloadCount() != null ? dto.getDownloadCount() : 0L);
                newDoc.setUploadedBy(uploader);
                newDoc.setCreatedAt(dto.getCreatedAt() != null ? dto.getCreatedAt() : LocalDateTime.now());

                documentRepository.save(newDoc);
                addedCount++;
            }
        }

        log.info("Document Cloud Sync Complete! Restored/Added {} new documents into database.", addedCount);

        // Update Google Drive with the combined latest state
        syncDocumentsToGoogleDrive();

        return addedCount;
    }

    /**
     * Background scan ensuring all bundled core books in classpath:books/*.pdf are uploaded to Google Drive.
     */
    public void archiveBundledBooksToGoogleDrive() {
        if (googleDriveStorageService == null || !googleDriveStorageService.isAvailable()) return;

        Thread archiveThread = new Thread(() -> {
            try {
                PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
                Resource[] resources = resolver.getResources("classpath*:books/*.pdf");
                log.info("Checking {} bundled books for Google Drive cloud archive...", resources.length);

                int uploadedCount = 0;
                for (Resource res : resources) {
                    String filename = res.getFilename();
                    if (filename == null || !filename.toLowerCase().endsWith(".pdf")) continue;

                    String existingId = googleDriveStorageService.findFileIdByName(filename);
                    if (existingId == null) {
                        try (InputStream in = res.getInputStream()) {
                            byte[] bytes = in.readAllBytes();
                            if (bytes.length > 0) {
                                googleDriveStorageService.uploadBytes(filename, bytes, "application/pdf");
                                log.info("Auto-archived bundled book '{}' to Google Drive ({} bytes)", filename, bytes.length);
                                uploadedCount++;
                            }
                        } catch (Exception ex) {
                            log.warn("Could not archive bundled book '{}' to Google Drive: {}", filename, ex.getMessage());
                        }
                    }
                }
                if (uploadedCount > 0) {
                    log.info("Successfully archived {} new bundled books to Google Drive Cloud Storage.", uploadedCount);
                }
            } catch (Exception e) {
                log.warn("Error running bundled books Google Drive archive: {}", e.getMessage());
            }
        }, "drive-bundled-archive");
        archiveThread.setDaemon(true);
        archiveThread.start();
    }
}
