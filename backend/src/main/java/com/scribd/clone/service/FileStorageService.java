package com.scribd.clone.service;

import com.scribd.clone.model.DocumentContent;
import com.scribd.clone.repository.DocumentContentRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    @Value("${scribd.storage.documents-dir:uploads/documents}")
    private String documentsDir;

    @Value("${scribd.storage.covers-dir:uploads/covers}")
    private String coversDir;

    private Path documentsPath;
    private Path coversPath;

    @Autowired(required = false)
    private DocumentContentRepository documentContentRepository;

    @PostConstruct
    public void init() {
        try {
            this.documentsPath = Paths.get(documentsDir).toAbsolutePath().normalize();
            this.coversPath = Paths.get(coversDir).toAbsolutePath().normalize();

            Files.createDirectories(this.documentsPath);
            Files.createDirectories(this.coversPath);
        } catch (IOException ex) {
            log.warn("Could not initialize upload storage directories on disk: {}", ex.getMessage());
        }
    }

    /**
     * Stores an uploaded PDF file both to local disk and to the persistent database.
     */
    public String storeDocument(MultipartFile file) throws IOException {
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex);
        }

        String storedFileName = UUID.randomUUID().toString() + extension;
        byte[] bytes = file.getBytes();

        // 1. Write to disk cache
        try {
            Files.createDirectories(this.documentsPath);
            Path targetLocation = this.documentsPath.resolve(storedFileName);
            Files.write(targetLocation, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (Exception ex) {
            log.warn("Could not write document to disk cache: {}", ex.getMessage());
        }

        // 2. Persist directly to database for permanent cloud retention across container restarts
        if (documentContentRepository != null) {
            try {
                DocumentContent content = new DocumentContent(storedFileName, bytes, file.getContentType());
                documentContentRepository.save(content);
                log.info("Persisted document bytes to database table DOCUMENT_CONTENTS: {}", storedFileName);
            } catch (Exception e) {
                log.warn("Could not persist document to database: {}", e.getMessage());
            }
        }

        return storedFileName;
    }

    /**
     * Stores an uploaded cover image both to local disk and to the persistent database.
     */
    public String storeCover(MultipartFile file) throws IOException {
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex);
        }

        String storedFileName = "cover_" + UUID.randomUUID().toString() + extension;
        byte[] bytes = file.getBytes();

        // 1. Write to disk cache
        try {
            Files.createDirectories(this.coversPath);
            Path targetLocation = this.coversPath.resolve(storedFileName);
            Files.write(targetLocation, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (Exception ex) {
            log.warn("Could not write cover to disk cache: {}", ex.getMessage());
        }

        // 2. Persist to database
        if (documentContentRepository != null) {
            try {
                DocumentContent content = new DocumentContent(storedFileName, bytes, file.getContentType());
                documentContentRepository.save(content);
                log.info("Persisted cover bytes to database table DOCUMENT_CONTENTS: {}", storedFileName);
            } catch (Exception e) {
                log.warn("Could not persist cover to database: {}", e.getMessage());
            }
        }

        return storedFileName;
    }

    /**
     * Stores direct binary content (e.g. initial generated seed PDFs).
     */
    public void storeDirectly(String fileName, byte[] bytes, String contentType) {
        if (documentContentRepository != null) {
            try {
                if (!documentContentRepository.existsByFileName(fileName)) {
                    DocumentContent content = new DocumentContent(fileName, bytes, contentType);
                    documentContentRepository.save(content);
                }
            } catch (Exception e) {
                log.warn("Could not store direct content to DB for {}: {}", fileName, e.getMessage());
            }
        }
    }

    /**
     * Inspects a PDF file on disk to accurately count its pages using Apache PDFBox.
     */
    public int countPdfPages(String fileName) {
        Path filePath = this.documentsPath.resolve(fileName);
        File file = filePath.toFile();

        // If not on disk, attempt recovery from DB first
        if (!file.exists()) {
            recoverFileFromDatabase(fileName, filePath);
        }

        if (!file.exists()) return 1;

        try (PDDocument document = Loader.loadPDF(file)) {
            return document.getNumberOfPages();
        } catch (Exception e) {
            return 1;
        }
    }

    /**
     * Loads a document resource for streaming/download.
     * If missing on disk (e.g., after a cloud container restart), restores it from the database.
     */
    public Resource loadDocumentAsResource(String fileName) {
        Path filePath = this.documentsPath.resolve(fileName).normalize();
        File file = filePath.toFile();

        // 1. If present on disk and readable, return directly
        if (file.exists() && file.canRead()) {
            try {
                return new UrlResource(filePath.toUri());
            } catch (MalformedURLException ignored) {}
        }

        // 2. Not on disk: recover from database
        byte[] recoveredBytes = recoverFileFromDatabase(fileName, filePath);
        if (recoveredBytes != null) {
            try {
                return new UrlResource(filePath.toUri());
            } catch (MalformedURLException ignored) {
                return new ByteArrayResource(recoveredBytes);
            }
        }

        return null;
    }

    /**
     * Loads a cover image resource.
     * If missing on disk, restores it from the database.
     */
    public Resource loadCoverAsResource(String fileName) {
        Path filePath = this.coversPath.resolve(fileName).normalize();
        File file = filePath.toFile();

        // 1. If present on disk
        if (file.exists() && file.canRead()) {
            try {
                return new UrlResource(filePath.toUri());
            } catch (MalformedURLException ignored) {}
        }

        // 2. Recover from database
        byte[] recoveredBytes = recoverFileFromDatabase(fileName, filePath);
        if (recoveredBytes != null) {
            try {
                return new UrlResource(filePath.toUri());
            } catch (MalformedURLException ignored) {
                return new ByteArrayResource(recoveredBytes);
            }
        }

        return null;
    }

    /**
     * Restores a missing file from the database to disk.
     */
    private byte[] recoverFileFromDatabase(String fileName, Path destination) {
        if (documentContentRepository == null) return null;

        try {
            Optional<DocumentContent> contentOpt = documentContentRepository.findByFileName(fileName);
            if (contentOpt.isPresent()) {
                byte[] data = contentOpt.get().getFileData();
                try {
                    Files.createDirectories(destination.getParent());
                    Files.write(destination, data, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
                    log.info("Successfully recovered missing file from database to disk: {}", fileName);
                } catch (IOException e) {
                    log.warn("Could not write recovered file to disk cache: {}", e.getMessage());
                }
                return data;
            }
        } catch (Exception e) {
            log.warn("Could not query database for file {}: {}", fileName, e.getMessage());
        }
        return null;
    }

    /**
     * Deletes a stored document file both from disk and database.
     */
    public void deleteDocument(String fileName) {
        try {
            Path filePath = this.documentsPath.resolve(fileName).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {}

        if (documentContentRepository != null) {
            try {
                documentContentRepository.deleteByFileName(fileName);
            } catch (Exception ignored) {}
        }
    }

    /**
     * Deletes a stored cover image both from disk and database.
     */
    public void deleteCover(String fileName) {
        try {
            Path filePath = this.coversPath.resolve(fileName).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {}

        if (documentContentRepository != null) {
            try {
                documentContentRepository.deleteByFileName(fileName);
            } catch (Exception ignored) {}
        }
    }

    public Path getDocumentsPath() {
        return documentsPath;
    }

    public Path getCoversPath() {
        return coversPath;
    }
}
