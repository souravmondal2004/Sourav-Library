package com.scribd.clone.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.beans.factory.annotation.Value;
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
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${scribd.storage.documents-dir:uploads/documents}")
    private String documentsDir;

    @Value("${scribd.storage.covers-dir:uploads/covers}")
    private String coversDir;

    private Path documentsPath;
    private Path coversPath;

    @PostConstruct
    public void init() {
        try {
            this.documentsPath = Paths.get(documentsDir).toAbsolutePath().normalize();
            this.coversPath = Paths.get(coversDir).toAbsolutePath().normalize();

            Files.createDirectories(this.documentsPath);
            Files.createDirectories(this.coversPath);
        } catch (IOException ex) {
            throw new RuntimeException("Could not initialize upload storage directories", ex);
        }
    }

    /**
     * Stores an uploaded PDF file and returns its generated unique filename.
     */
    public String storeDocument(MultipartFile file) throws IOException {
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex);
        }

        String storedFileName = UUID.randomUUID().toString() + extension;
        Path targetLocation = this.documentsPath.resolve(storedFileName);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        return storedFileName;
    }

    /**
     * Stores an uploaded cover image and returns its generated unique filename.
     */
    public String storeCover(MultipartFile file) throws IOException {
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex);
        }

        String storedFileName = "cover_" + UUID.randomUUID().toString() + extension;
        Path targetLocation = this.coversPath.resolve(storedFileName);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        return storedFileName;
    }

    /**
     * Inspects a PDF file on disk to accurately count its pages using Apache PDFBox.
     */
    public int countPdfPages(String fileName) {
        Path filePath = this.documentsPath.resolve(fileName);
        File file = filePath.toFile();
        if (!file.exists()) return 1;

        try (PDDocument document = Loader.loadPDF(file)) {
            return document.getNumberOfPages();
        } catch (Exception e) {
            // Fallback if not standard PDF
            return 1;
        }
    }

    /**
     * Loads a document resource for streaming/download.
     */
    public Resource loadDocumentAsResource(String fileName) {
        try {
            Path filePath = this.documentsPath.resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
        } catch (MalformedURLException ignored) {}
        return null;
    }

    /**
     * Loads a cover image resource.
     */
    public Resource loadCoverAsResource(String fileName) {
        try {
            Path filePath = this.coversPath.resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
        } catch (MalformedURLException ignored) {}
        return null;
    }

    /**
     * Deletes a stored document file.
     */
    public void deleteDocument(String fileName) {
        try {
            Path filePath = this.documentsPath.resolve(fileName).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {}
    }

    /**
     * Deletes a stored cover image.
     */
    public void deleteCover(String fileName) {
        try {
            Path filePath = this.coversPath.resolve(fileName).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {}
    }

    public Path getDocumentsPath() {
        return documentsPath;
    }

    public Path getCoversPath() {
        return coversPath;
    }
}
