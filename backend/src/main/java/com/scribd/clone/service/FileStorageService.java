package com.scribd.clone.service;

import com.scribd.clone.model.DocumentContent;
import com.scribd.clone.repository.DocumentContentRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.io.IOUtils;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
    private JdbcTemplate jdbcTemplate;

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
     * Stores an uploaded PDF file directly to disk via streaming (zero-heap allocation)
     * and streams it to the persistent database table to survive container restarts.
     */
    public String storeDocument(MultipartFile file) throws IOException {
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex);
        }

        String storedFileName = UUID.randomUUID().toString() + extension;

        // 1. Stream directly to disk cache - never buffer the entire file into JVM byte[]
        Files.createDirectories(this.documentsPath);
        Path targetLocation = this.documentsPath.resolve(storedFileName);
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, targetLocation, StandardCopyOption.REPLACE_EXISTING);
        }

        // 2. Stream directly from disk into database BLOB/bytea without loading into JVM heap
        persistFileToDatabase(storedFileName, targetLocation, file.getContentType());

        return storedFileName;
    }

    /**
     * Stores an uploaded cover image directly to disk and database via streaming.
     */
    public String storeCover(MultipartFile file) throws IOException {
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex);
        }

        String storedFileName = "cover_" + UUID.randomUUID().toString() + extension;

        // 1. Stream directly to disk
        Files.createDirectories(this.coversPath);
        Path targetLocation = this.coversPath.resolve(storedFileName);
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, targetLocation, StandardCopyOption.REPLACE_EXISTING);
        }

        // 2. Stream to database
        persistFileToDatabase(storedFileName, targetLocation, file.getContentType());

        return storedFileName;
    }

    /**
     * Stores direct binary content (e.g., initial generated seed PDFs).
     */
    public void storeDirectly(String fileName, byte[] bytes, String contentType) {
        try {
            Files.createDirectories(this.documentsPath);
            Path targetLocation = this.documentsPath.resolve(fileName);
            if (!Files.exists(targetLocation)) {
                Files.write(targetLocation, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            }
            persistFileToDatabase(fileName, targetLocation, contentType);
        } catch (Exception e) {
            log.warn("Could not store direct content for {}: {}", fileName, e.getMessage());
        }
    }

    /**
     * Streams file contents from disk directly into the database table DOCUMENT_CONTENTS.
     * Uses JDBC binary stream to ensure ZERO heap allocation regardless of file size.
     */
    private void persistFileToDatabase(String fileName, Path filePath, String contentType) {
        if (jdbcTemplate == null || !Files.exists(filePath)) return;

        try {
            long fileSize = Files.size(filePath);
            // Delete any existing record for this filename
            jdbcTemplate.update("DELETE FROM DOCUMENT_CONTENTS WHERE file_name = ?", fileName);

            String sql = "INSERT INTO DOCUMENT_CONTENTS (file_name, content_type, file_data, created_at) VALUES (?, ?, ?, ?)";
            jdbcTemplate.execute(sql, (org.springframework.jdbc.core.PreparedStatementCallback<Void>) ps -> {
                ps.setString(1, fileName);
                ps.setString(2, contentType != null ? contentType : "application/pdf");
                try (InputStream is = Files.newInputStream(filePath)) {
                    ps.setBinaryStream(3, is, fileSize);
                    ps.setTimestamp(4, Timestamp.valueOf(LocalDateTime.now()));
                    ps.executeUpdate();
                } catch (IOException ioEx) {
                    throw new java.sql.SQLException("Error streaming file into database: " + ioEx.getMessage(), ioEx);
                }
                return null;
            });
            log.info("Persisted file to database table DOCUMENT_CONTENTS via stream: {} ({} bytes)", fileName, fileSize);
        } catch (Throwable e) {
            log.warn("Could not persist file to database (relying on disk storage): {}", e.getMessage());
        }
    }

    /**
     * Inspects a PDF file on disk to accurately and safely count its pages.
     * Uses a fast, zero-memory binary scanner first, and falls back to PDFBox with
     * disk-based stream caching (IOUtils.createTempFileOnlyStreamCache()) to prevent OutOfMemoryError.
     */
    public int countPdfPages(String fileName) {
        Path filePath = this.documentsPath.resolve(fileName);
        File file = filePath.toFile();

        // If not on disk, attempt recovery from DB first
        if (!file.exists()) {
            recoverFileFromDatabase(fileName, filePath);
        }

        if (!file.exists()) return 1;

        // Tier 1: Fast zero-memory binary scan for /Type /Pages with /Count
        int fastCount = fastExtractPdfPageCount(file);
        if (fastCount > 0) {
            log.info("Fast-detected PDF page count for {}: {}", fileName, fastCount);
            return fastCount;
        }

        // Tier 2: Apache PDFBox with temp-file stream cache to avoid JVM heap allocation
        try (PDDocument document = Loader.loadPDF(file, IOUtils.createTempFileOnlyStreamCache())) {
            int pages = document.getNumberOfPages();
            return pages > 0 ? pages : 1;
        } catch (Throwable t) {
            log.warn("PDFBox could not parse page count for {}: {}", fileName, t.getMessage());
            return 1;
        }
    }

    /**
     * Scans the PDF file in small 16KB stream buffers for standard PDF page tree dictionaries
     * (/Type /Pages with /Count N). Avoids constructing PDFBox object graphs in heap.
     */
    private int fastExtractPdfPageCount(File file) {
        if (!file.exists() || file.length() == 0) return 0;

        try (InputStream is = Files.newInputStream(file.toPath())) {
            byte[] buffer = new byte[16384];
            int bytesRead;
            int maxCount = 0;
            StringBuilder textBuffer = new StringBuilder();

            Pattern countPattern = Pattern.compile("/Count\\s+(\\d+)");
            Pattern pagesPattern = Pattern.compile("/Type\\s*/Pages\\b");

            while ((bytesRead = is.read(buffer)) != -1) {
                String chunk = new String(buffer, 0, bytesRead, java.nio.charset.StandardCharsets.ISO_8859_1);
                textBuffer.append(chunk);

                if (textBuffer.length() > 32768) {
                    textBuffer.delete(0, textBuffer.length() - 16384);
                }

                String currentText = textBuffer.toString();
                if (pagesPattern.matcher(currentText).find()) {
                    Matcher m = countPattern.matcher(currentText);
                    while (m.find()) {
                        try {
                            int val = Integer.parseInt(m.group(1));
                            if (val > maxCount && val < 50000) {
                                maxCount = val;
                            }
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
            return maxCount;
        } catch (Throwable ignored) {
            return 0;
        }
    }

    /**
     * Loads a document resource for streaming/download.
     * If missing on disk (e.g., after a cloud container restart), restores it from the database via stream.
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

        // 2. Not on disk: recover from database directly into disk file via stream
        boolean recovered = recoverFileFromDatabase(fileName, filePath);
        if (recovered && file.exists() && file.canRead()) {
            try {
                return new UrlResource(filePath.toUri());
            } catch (MalformedURLException ignored) {}
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
        boolean recovered = recoverFileFromDatabase(fileName, filePath);
        if (recovered && file.exists() && file.canRead()) {
            try {
                return new UrlResource(filePath.toUri());
            } catch (MalformedURLException ignored) {}
        }

        return null;
    }

    /**
     * Restores a missing file from the database to disk using JDBC binary streaming.
     * Streams directly to destination file with zero heap buffering.
     */
    private boolean recoverFileFromDatabase(String fileName, Path destination) {
        if (jdbcTemplate == null) return false;

        try {
            String sql = "SELECT file_data FROM DOCUMENT_CONTENTS WHERE file_name = ?";
            Boolean success = jdbcTemplate.query(sql, rs -> {
                if (rs.next()) {
                    try (InputStream is = rs.getBinaryStream("file_data")) {
                        if (is != null) {
                            Files.createDirectories(destination.getParent());
                            Files.copy(is, destination, StandardCopyOption.REPLACE_EXISTING);
                            log.info("Successfully recovered missing file from database to disk via stream: {}", fileName);
                            return true;
                        }
                    } catch (IOException e) {
                        log.warn("Could not write recovered stream to disk: {}", e.getMessage());
                    }
                }
                return false;
            }, fileName);

            return Boolean.TRUE.equals(success);
        } catch (Throwable e) {
            log.warn("Could not query database for file {}: {}", fileName, e.getMessage());
            return false;
        }
    }

    /**
     * Deletes a stored document file both from disk and database.
     */
    public void deleteDocument(String fileName) {
        try {
            Path filePath = this.documentsPath.resolve(fileName).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {}

        if (jdbcTemplate != null) {
            try {
                jdbcTemplate.update("DELETE FROM DOCUMENT_CONTENTS WHERE file_name = ?", fileName);
            } catch (Throwable ignored) {}
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

        if (jdbcTemplate != null) {
            try {
                jdbcTemplate.update("DELETE FROM DOCUMENT_CONTENTS WHERE file_name = ?", fileName);
            } catch (Throwable ignored) {}
        }
    }

    public Path getDocumentsPath() {
        return documentsPath;
    }

    public Path getCoversPath() {
        return coversPath;
    }
}
