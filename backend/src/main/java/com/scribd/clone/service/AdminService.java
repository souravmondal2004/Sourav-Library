package com.scribd.clone.service;

import com.scribd.clone.dto.AdminStatsDto;
import com.scribd.clone.dto.DocumentResponseDto;
import com.scribd.clone.dto.DocumentUpdateDto;
import com.scribd.clone.model.Category;
import com.scribd.clone.model.Document;
import com.scribd.clone.model.User;
import com.scribd.clone.repository.CategoryRepository;
import com.scribd.clone.repository.DocumentRepository;
import com.scribd.clone.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

import com.scribd.clone.dto.UserActivityDto;
import com.scribd.clone.dto.UserSummaryDto;
import com.scribd.clone.repository.BookmarkRepository;
import com.scribd.clone.repository.ReadingHistoryRepository;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private final DocumentRepository documentRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final ReadingHistoryRepository readingHistoryRepository;
    private final BookmarkRepository bookmarkRepository;
    private final FileStorageService fileStorageService;
    private final DocumentSyncService documentSyncService;

    public AdminService(
            DocumentRepository documentRepository,
            CategoryRepository categoryRepository,
            UserRepository userRepository,
            ReadingHistoryRepository readingHistoryRepository,
            BookmarkRepository bookmarkRepository,
            FileStorageService fileStorageService,
            DocumentSyncService documentSyncService
    ) {
        this.documentRepository = documentRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.readingHistoryRepository = readingHistoryRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.fileStorageService = fileStorageService;
        this.documentSyncService = documentSyncService;
    }

    public Page<DocumentResponseDto> getAdminDocuments(String query, Long categoryId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        if (query != null && !query.isBlank()) {
            return documentRepository.findByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCase(query.trim(), query.trim(), pageable)
                    .map(DocumentResponseDto::fromEntity);
        } else if (categoryId != null) {
            return documentRepository.findByCategoryIdAndIsPublishedTrue(categoryId, pageable)
                    .map(DocumentResponseDto::fromEntity);
        } else {
            return documentRepository.findAll(pageable)
                    .map(DocumentResponseDto::fromEntity);
        }
    }

    public DocumentResponseDto uploadDocument(
            MultipartFile pdfFile,
            MultipartFile coverFile,
            String title,
            String author,
            String description,
            Long categoryId,
            Integer pageCount,
            String language,
            Integer publishedYear,
            Boolean isFeatured,
            Boolean isPublished,
            String username
    ) throws IOException {
        if (pdfFile == null || pdfFile.isEmpty()) {
            throw new IllegalArgumentException("PDF file is required");
        }

        // 1. Stream PDF file to disk and persistent DB outside the metadata transaction
        String storedFileName = fileStorageService.storeDocument(pdfFile);

        // 2. Safely calculate pages (fast scanner or memory-cached PDFBox)
        int calculatedPages = (pageCount != null && pageCount > 0) 
                ? pageCount 
                : fileStorageService.countPdfPages(storedFileName);

        // 3. Stream cover image if provided
        String storedCoverName = null;
        if (coverFile != null && !coverFile.isEmpty()) {
            storedCoverName = fileStorageService.storeCover(coverFile);
        }

        // 4. Persist metadata entity inside transaction
        DocumentResponseDto response = saveUploadedDocumentMetadata(
                title, author, description, categoryId, calculatedPages,
                language, publishedYear, isFeatured, isPublished, username,
                storedFileName, storedCoverName, pdfFile.getOriginalFilename(),
                pdfFile.getSize(), pdfFile.getContentType()
        );

        // 5. Update Google Drive documents_catalog.json cloud archive
        if (documentSyncService != null) {
            documentSyncService.syncDocumentsToGoogleDrive();
        }

        return response;
    }

    @Transactional
    public DocumentResponseDto saveUploadedDocumentMetadata(
            String title,
            String author,
            String description,
            Long categoryId,
            int calculatedPages,
            String language,
            Integer publishedYear,
            Boolean isFeatured,
            Boolean isPublished,
            String username,
            String storedFileName,
            String storedCoverName,
            String originalFilename,
            long fileSize,
            String contentType
    ) {
        User uploader = (username != null ? userRepository.findByUsername(username).orElse(null) : null);
        if (uploader == null) {
            uploader = userRepository.findByRole("ROLE_ADMIN").stream().findFirst()
                    .orElseGet(() -> userRepository.findAll().stream().findFirst().orElse(null));
        }
        if (uploader == null) {
            User defaultAdmin = new User("Sourav", "sourav@lumina.local", "$2a$10$wK1bYfI8uR5Xk4Z9vG4qeeHlD9iV5fD/5hHqXmHnZb1hYhHjM2Wqm", "ROLE_ADMIN", "Sourav (Admin)");
            uploader = userRepository.save(defaultAdmin);
        }

        Category category = null;
        if (categoryId != null) {
            category = categoryRepository.findById(categoryId).orElse(null);
        }
        if (category == null) {
            category = categoryRepository.findAll().stream().findFirst().orElse(null);
        }
        if (category == null) {
            category = categoryRepository.save(new Category("General", "general", "General publications & documents", "BookOpen"));
        }

        Document document = new Document();
        document.setTitle(title);
        document.setAuthor(author);
        document.setDescription(description);
        document.setCategory(category);
        document.setFileName(storedFileName);
        document.setOriginalFilename(originalFilename);
        document.setFileSize(fileSize);
        document.setFileType(contentType != null ? contentType : "application/pdf");
        document.setCoverImagePath(storedCoverName);
        document.setPageCount(calculatedPages);
        document.setLanguage(language != null && !language.isBlank() ? language : "English");
        document.setPublishedYear(publishedYear);
        document.setIsFeatured(isFeatured != null ? isFeatured : false);
        document.setIsPublished(isPublished != null ? isPublished : true);
        document.setUploadedBy(uploader);

        Document saved = documentRepository.save(document);
        return DocumentResponseDto.fromEntity(saved);
    }

    @Transactional
    public DocumentResponseDto updateDocument(Long id, DocumentUpdateDto dto) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with id: " + id));

        Category category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Category not found with id: " + dto.getCategoryId()));

        document.setTitle(dto.getTitle());
        document.setAuthor(dto.getAuthor());
        document.setDescription(dto.getDescription());
        document.setCategory(category);
        if (dto.getPageCount() != null) document.setPageCount(dto.getPageCount());
        if (dto.getLanguage() != null) document.setLanguage(dto.getLanguage());
        if (dto.getPublishedYear() != null) document.setPublishedYear(dto.getPublishedYear());
        if (dto.getIsFeatured() != null) document.setIsFeatured(dto.getIsFeatured());
        if (dto.getIsPublished() != null) document.setIsPublished(dto.getIsPublished());

        Document saved = documentRepository.save(document);
        return DocumentResponseDto.fromEntity(saved);
    }

    @Transactional
    public DocumentResponseDto togglePublished(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with id: " + id));

        document.setIsPublished(!document.getIsPublished());
        return DocumentResponseDto.fromEntity(documentRepository.save(document));
    }

    @Transactional
    public DocumentResponseDto toggleFeatured(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with id: " + id));

        document.setIsFeatured(!document.getIsFeatured());
        return DocumentResponseDto.fromEntity(documentRepository.save(document));
    }

    @Transactional
    public void deleteDocument(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with id: " + id));

        // Delete relational dependencies to prevent FK constraint violations
        try {
            if (readingHistoryRepository != null) {
                readingHistoryRepository.deleteByDocumentId(id);
            }
        } catch (Exception ignored) {}

        try {
            if (bookmarkRepository != null) {
                bookmarkRepository.deleteByDocumentId(id);
            }
        } catch (Exception ignored) {}

        // Delete physical files
        if (document.getFileName() != null) {
            fileStorageService.deleteDocument(document.getFileName());
        }
        if (document.getCoverImagePath() != null) {
            fileStorageService.deleteCover(document.getCoverImagePath());
        }

        documentRepository.delete(document);

        // Update Google Drive documents_catalog.json cloud archive
        if (documentSyncService != null) {
            documentSyncService.syncDocumentsToGoogleDrive();
        }
    }

    @Transactional
    public DocumentResponseDto replaceDocumentFile(Long documentId, MultipartFile pdfFile) throws IOException {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with id: " + documentId));

        if (pdfFile == null || pdfFile.isEmpty()) {
            throw new IllegalArgumentException("PDF file is required");
        }

        String storedFileName = fileStorageService.storeDocument(pdfFile);
        int pages = fileStorageService.countPdfPages(storedFileName);

        if (doc.getFileName() != null && !doc.getFileName().equals(storedFileName)) {
            fileStorageService.deleteDocument(doc.getFileName());
        }

        doc.setFileName(storedFileName);
        doc.setOriginalFilename(pdfFile.getOriginalFilename());
        doc.setFileSize(pdfFile.getSize());
        doc.setFileType(pdfFile.getContentType() != null ? pdfFile.getContentType() : "application/pdf");
        doc.setPageCount(pages > 0 ? pages : (doc.getPageCount() != null ? doc.getPageCount() : 1));

        Document saved = documentRepository.save(doc);

        // Update Google Drive documents_catalog.json cloud archive
        if (documentSyncService != null) {
            documentSyncService.syncDocumentsToGoogleDrive();
        }

        return DocumentResponseDto.fromEntity(saved);
    }

    public boolean syncDocumentFileDirectly(String targetFileName, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty() || targetFileName == null || targetFileName.isBlank()) return false;
        fileStorageService.storeDirectly(targetFileName, file.getBytes(), file.getContentType());
        return true;
    }

    public AdminStatsDto getAdminStats() {
        long totalDocs = documentRepository.count();
        long publishedDocs = documentRepository.countByIsPublishedTrue();
        long totalViews = documentRepository.getTotalViews();
        long totalDownloads = documentRepository.getTotalDownloads();
        long totalCats = categoryRepository.count();
        long totalUsers = userRepository.count();
        long totalStorage = documentRepository.getTotalStorageUsed();

        return new AdminStatsDto(
                totalDocs,
                publishedDocs,
                totalViews,
                totalDownloads,
                totalCats,
                totalUsers,
                totalStorage,
                formatBytes(totalStorage),
                com.scribd.clone.config.DatabaseConfig.getActiveDatabaseType(),
                com.scribd.clone.config.DatabaseConfig.isDatabasePersistent()
        );
    }

    public List<UserActivityDto> getUserActivityLogs() {
        return readingHistoryRepository.findAllByOrderByLastReadAtDesc()
                .stream()
                .map(UserActivityDto::fromEntity)
                .collect(Collectors.toList());
    }

    public List<UserSummaryDto> getAllUsersSummary() {
        return userRepository.findAll()
                .stream()
                .map(user -> {
                    long readCount = readingHistoryRepository.countByUserId(user.getId());
                    return new UserSummaryDto(user, readCount);
                })
                .collect(Collectors.toList());
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        char pre = "KMGTPE".charAt(exp - 1);
        return String.format("%.1f %sB", bytes / Math.pow(1024, exp), pre);
    }
}
