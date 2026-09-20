package com.scribd.clone.service;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.InputStreamContent;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Enterprise Google Drive Cloud Storage Service (5 TB Primary Storage).
 * Handles persistent document and cover storage directly in Google Drive folder:
 * folderId: 1ZwKXAE2dM9JmJIGl2HZap1RiW9CSeVPS
 */
@Service
public class GoogleDriveStorageService {

    private static final Logger log = LoggerFactory.getLogger(GoogleDriveStorageService.class);
    private static final String APPLICATION_NAME = "Scribd-Clone-Platform";

    @Value("${scribd.storage.google-drive.enabled:true}")
    private boolean enabled;

    @Value("${scribd.storage.google-drive.folder-id:1ZwKXAE2dM9JmJIGl2HZap1RiW9CSeVPS}")
    private String folderId;

    @Value("${scribd.storage.google-drive.credentials-path:classpath:google-credentials.json}")
    private String credentialsPath;

    private final ResourceLoader resourceLoader;
    private Drive driveClient;
    private volatile boolean isReady = false;

    // In-memory cache for fileName -> Google Drive fileId to maximize read performance
    private final Map<String, String> fileNameToIdCache = new ConcurrentHashMap<>();

    public GoogleDriveStorageService(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @PostConstruct
    public void init() {
        if (!enabled) {
            log.info("Google Drive storage is disabled via configuration.");
            return;
        }

        try {
            InputStream credentialsStream = resolveCredentialsStream();
            if (credentialsStream == null) {
                log.warn("Google Drive credentials not found at: {}. Google Drive storage will be unavailable.", credentialsPath);
                return;
            }

            GoogleCredentials credentials = GoogleCredentials.fromStream(credentialsStream)
                    .createScoped(Collections.singletonList(DriveScopes.DRIVE));

            this.driveClient = new Drive.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance(),
                    new HttpCredentialsAdapter(credentials)
            ).setApplicationName(APPLICATION_NAME).build();

            // Verify access to the designated folder
            File targetFolder = driveClient.files().get(folderId)
                    .setFields("id, name, mimeType")
                    .setSupportsAllDrives(true)
                    .execute();

            this.isReady = true;
            log.info("Successfully connected to Google Drive Cloud Storage! Target Folder: '{}' (ID: {})",
                    targetFolder.getName(), targetFolder.getId());

        } catch (Exception e) {
            log.error("Failed to initialize Google Drive Cloud Storage: {}", e.getMessage(), e);
            this.isReady = false;
        }
    }

    private InputStream resolveCredentialsStream() {
        try {
            // 1. Direct JSON from environment variable (ideal for cloud like Render / Heroku / Railway)
            String envJson = System.getenv("GOOGLE_CREDENTIALS_JSON");
            if (envJson != null && !envJson.isBlank()) {
                log.info("Loading Google Drive credentials from GOOGLE_CREDENTIALS_JSON environment variable.");
                return new java.io.ByteArrayInputStream(envJson.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }

            // 2. Direct path from environment variable
            String envPath = System.getenv("GOOGLE_APPLICATION_CREDENTIALS");
            if (envPath != null && !envPath.isBlank()) {
                Path p = Paths.get(envPath);
                if (Files.exists(p)) {
                    return Files.newInputStream(p);
                }
            }

            // 3. Classpath resource
            if (credentialsPath.startsWith("classpath:")) {
                Resource resource = resourceLoader.getResource(credentialsPath);
                if (resource.exists()) {
                    return resource.getInputStream();
                }
            }

            // 4. File system path
            Path directPath = Paths.get(credentialsPath);
            if (Files.exists(directPath)) {
                return Files.newInputStream(directPath);
            }

            // 5. Check working directory or common fallback locations
            Path localJson = Paths.get("google-credentials.json");
            if (Files.exists(localJson)) {
                return Files.newInputStream(localJson);
            }

            Path srcJson = Paths.get("src/main/resources/google-credentials.json");
            if (Files.exists(srcJson)) {
                return Files.newInputStream(srcJson);
            }
        } catch (IOException e) {
            log.warn("Error opening Google credentials stream: {}", e.getMessage());
        }
        return null;
    }

    public boolean isAvailable() {
        return isReady && driveClient != null;
    }

    /**
     * Uploads a file directly into the designated Google Drive folder.
     * Returns the Google Drive fileId.
     */
    public String uploadFile(String fileName, InputStream contentStream, String contentType, long fileSize) throws IOException {
        if (!isAvailable()) {
            throw new IllegalStateException("Google Drive storage is not initialized or unavailable.");
        }

        File fileMetadata = new File();
        fileMetadata.setName(fileName);
        fileMetadata.setParents(Collections.singletonList(folderId));

        InputStreamContent mediaContent = new InputStreamContent(
                contentType != null ? contentType : "application/octet-stream",
                contentStream
        );
        if (fileSize > 0) {
            mediaContent.setLength(fileSize);
        }

        File uploadedFile = driveClient.files().create(fileMetadata, mediaContent)
                .setFields("id, name, size")
                .setSupportsAllDrives(true)
                .execute();

        String fileId = uploadedFile.getId();
        fileNameToIdCache.put(fileName, fileId);

        log.info("Uploaded '{}' directly to Google Drive Cloud Storage (FileId: {}, Size: {} bytes)",
                fileName, fileId, uploadedFile.getSize() != null ? uploadedFile.getSize() : fileSize);

        return fileId;
    }

    /**
     * Uploads raw bytes directly into Google Drive folder.
     */
    public String uploadBytes(String fileName, byte[] bytes, String contentType) throws IOException {
        try (InputStream is = new ByteArrayInputStream(bytes)) {
            return uploadFile(fileName, is, contentType, bytes.length);
        }
    }

    /**
     * Finds the Google Drive file ID by exact file name inside our designated folder.
     */
    public String findFileIdByName(String fileName) {
        if (!isAvailable() || fileName == null || fileName.isBlank()) return null;

        String cached = fileNameToIdCache.get(fileName);
        if (cached != null) return cached;

        try {
            String query = String.format("name = '%s' and '%s' in parents and trashed = false",
                    fileName.replace("'", "\\'"), folderId);

            FileList result = driveClient.files().list()
                    .setQ(query)
                    .setFields("files(id, name, size)")
                    .setSupportsAllDrives(true)
                    .setIncludeItemsFromAllDrives(true)
                    .setPageSize(1)
                    .execute();

            if (result.getFiles() != null && !result.getFiles().isEmpty()) {
                String fileId = result.getFiles().get(0).getId();
                fileNameToIdCache.put(fileName, fileId);
                return fileId;
            }
        } catch (Exception e) {
            log.warn("Could not query Google Drive for file '{}': {}", fileName, e.getMessage());
        }
        return null;
    }

    /**
     * Streams the binary content of a file from Google Drive.
     */
    public InputStream downloadStream(String fileNameOrId) throws IOException {
        if (!isAvailable()) {
            throw new IllegalStateException("Google Drive storage is unavailable.");
        }

        String fileId = fileNameOrId;
        if (!fileNameOrId.matches("^[a-zA-Z0-9_-]{20,}$")) {
            // It's a file name, resolve to fileId
            fileId = findFileIdByName(fileNameOrId);
        }

        if (fileId == null) {
            return null;
        }

        return driveClient.files().get(fileId)
                .setSupportsAllDrives(true)
                .executeMediaAsInputStream();
    }

    /**
     * Gets file size directly from Google Drive metadata.
     */
    public Long getFileSize(String fileNameOrId) {
        if (!isAvailable()) return null;
        try {
            String fileId = fileNameOrId;
            if (!fileNameOrId.matches("^[a-zA-Z0-9_-]{20,}$")) {
                fileId = findFileIdByName(fileNameOrId);
            }
            if (fileId == null) return null;

            File file = driveClient.files().get(fileId)
                    .setFields("size")
                    .setSupportsAllDrives(true)
                    .execute();
            return file.getSize();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Deletes a file from Google Drive.
     */
    public boolean deleteFile(String fileNameOrId) {
        if (!isAvailable() || fileNameOrId == null) return false;
        try {
            String fileId = fileNameOrId;
            if (!fileNameOrId.matches("^[a-zA-Z0-9_-]{20,}$")) {
                fileId = findFileIdByName(fileNameOrId);
            }
            if (fileId != null) {
                driveClient.files().delete(fileId)
                        .setSupportsAllDrives(true)
                        .execute();
                fileNameToIdCache.remove(fileNameOrId);
                log.info("Deleted '{}' (ID: {}) from Google Drive Cloud Storage.", fileNameOrId, fileId);
                return true;
            }
        } catch (Exception e) {
            log.warn("Could not delete file '{}' from Google Drive: {}", fileNameOrId, e.getMessage());
        }
        return false;
    }
}
