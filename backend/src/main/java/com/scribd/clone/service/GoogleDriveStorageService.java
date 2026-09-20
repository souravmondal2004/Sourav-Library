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

    @Value("${scribd.storage.google-drive.client-id:}")
    private String clientId;

    @Value("${scribd.storage.google-drive.client-secret:}")
    private String clientSecret;

    @Value("${scribd.storage.google-drive.refresh-token:}")
    private String refreshToken;

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
            GoogleCredentials credentials = null;

            // 1. Primary for Personal @gmail.com accounts: OAuth 2.0 User Refresh Token
            String resolvedClientId = resolveValue(clientId, "GOOGLE_DRIVE_CLIENT_ID");
            String resolvedClientSecret = resolveValue(clientSecret, "GOOGLE_DRIVE_CLIENT_SECRET");
            String resolvedRefreshToken = resolveValue(refreshToken, "GOOGLE_DRIVE_REFRESH_TOKEN");
            String resolvedFolderId = resolveValue(folderId, "GOOGLE_DRIVE_FOLDER_ID");
            if (resolvedFolderId != null && !resolvedFolderId.isBlank()) {
                this.folderId = resolvedFolderId;
            }

            // Check if google-oauth-credentials.json exists
            if (resolvedClientId == null || resolvedClientSecret == null || resolvedRefreshToken == null) {
                try {
                    InputStream oauthJson = resolveOAuthJsonStream();
                    if (oauthJson != null) {
                        com.google.gson.JsonObject obj = com.google.gson.JsonParser.parseReader(
                                new java.io.InputStreamReader(oauthJson, java.nio.charset.StandardCharsets.UTF_8)).getAsJsonObject();
                        if (obj.has("client_id") && obj.has("client_secret") && obj.has("refresh_token")) {
                            resolvedClientId = obj.get("client_id").getAsString();
                            resolvedClientSecret = obj.get("client_secret").getAsString();
                            resolvedRefreshToken = obj.get("refresh_token").getAsString();
                            if (obj.has("folder_id") && !obj.get("folder_id").getAsString().isBlank()) {
                                this.folderId = obj.get("folder_id").getAsString();
                            }
                            log.info("Loaded Google Drive OAuth2 credentials from google-oauth-credentials.json.");
                        }
                    }
                } catch (Exception ex) {
                    log.warn("Could not read google-oauth-credentials.json: {}", ex.getMessage());
                }
            }

            if (resolvedClientId != null && resolvedClientSecret != null && resolvedRefreshToken != null
                    && !resolvedClientId.isBlank() && !resolvedClientSecret.isBlank() && !resolvedRefreshToken.isBlank()) {
                credentials = com.google.auth.oauth2.UserCredentials.newBuilder()
                        .setClientId(resolvedClientId)
                        .setClientSecret(resolvedClientSecret)
                        .setRefreshToken(resolvedRefreshToken)
                        .build();
                log.info("Initializing Google Drive Cloud Storage via Personal Account OAuth 2.0 User Credentials (Personal @gmail.com storage quota).");
            } else {
                // 2. Service Account JSON fallback
                InputStream credentialsStream = resolveCredentialsStream();
                if (credentialsStream == null) {
                    log.warn("Google Drive credentials not found. Google Drive storage will be unavailable.");
                    return;
                }

                credentials = GoogleCredentials.fromStream(credentialsStream)
                        .createScoped(Collections.singletonList(DriveScopes.DRIVE));
                log.info("Initializing Google Drive Cloud Storage via Service Account credentials.");
            }

            this.driveClient = new Drive.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance(),
                    new HttpCredentialsAdapter(credentials)
            ).setApplicationName(APPLICATION_NAME).build();

            // Verify access to the designated folder
            File targetFolder = driveClient.files().get(this.folderId)
                    .setFields("id, name, mimeType, driveId, capabilities")
                    .setSupportsAllDrives(true)
                    .execute();

            this.isReady = true;
            log.info("Successfully connected to Google Drive Cloud Storage! Target Folder: '{}' (ID: {}), driveId: {}, canAddChildren: {}",
                    targetFolder.getName(), targetFolder.getId(), targetFolder.getDriveId(),
                    targetFolder.getCapabilities() != null ? targetFolder.getCapabilities().getCanAddChildren() : "null");

        } catch (Exception e) {
            log.error("Failed to initialize Google Drive Cloud Storage: {}", e.getMessage(), e);
            this.isReady = false;
        }
    }

    private String resolveValue(String propertyValue, String envName) {
        if (propertyValue != null && !propertyValue.isBlank()) {
            return propertyValue.trim();
        }
        String envVal = System.getenv(envName);
        if (envVal != null && !envVal.isBlank()) {
            return envVal.trim();
        }
        return null;
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

    private InputStream resolveOAuthJsonStream() {
        try {
            Resource res = resourceLoader.getResource("classpath:google-oauth-credentials.json");
            if (res.exists()) {
                return res.getInputStream();
            }

            Path p1 = Paths.get("google-oauth-credentials.json");
            if (Files.exists(p1)) {
                return Files.newInputStream(p1);
            }

            Path p2 = Paths.get("backend/src/main/resources/google-oauth-credentials.json");
            if (Files.exists(p2)) {
                return Files.newInputStream(p2);
            }

            Path p3 = Paths.get("src/main/resources/google-oauth-credentials.json");
            if (Files.exists(p3)) {
                return Files.newInputStream(p3);
            }
        } catch (Exception e) {
            log.warn("Could not resolve google-oauth-credentials.json stream: {}", e.getMessage());
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

    /**
     * Saves or overwrites an existing file in the Google Drive folder.
     * Ideal for persistent JSON catalog backups (e.g. videos_catalog.json).
     */
    public String saveOrUpdateFile(String fileName, byte[] content, String contentType) throws IOException {
        if (!isAvailable()) {
            throw new IllegalStateException("Google Drive storage is unavailable.");
        }

        String existingFileId = findFileIdByName(fileName);
        InputStreamContent mediaContent = new InputStreamContent(
                contentType != null ? contentType : "application/octet-stream",
                new ByteArrayInputStream(content)
        );
        mediaContent.setLength(content.length);

        if (existingFileId != null) {
            File patch = new File();
            patch.setName(fileName);
            File updated = driveClient.files().update(existingFileId, patch, mediaContent)
                    .setFields("id, name, size")
                    .setSupportsAllDrives(true)
                    .execute();
            fileNameToIdCache.put(fileName, updated.getId());
            log.info("Overwrote '{}' in Google Drive folder (ID: {}, Size: {} bytes).", fileName, updated.getId(), content.length);
            return updated.getId();
        } else {
            return uploadBytes(fileName, content, contentType);
        }
    }

    /**
     * Reads entire binary content of a file from Google Drive into a byte array.
     */
    public byte[] readFileBytes(String fileName) throws IOException {
        try (InputStream is = downloadStream(fileName)) {
            if (is == null) return null;
            return is.readAllBytes();
        }
    }

    /**
     * Lists all files currently in the designated Google Drive folder.
     */
    public java.util.List<File> listAllFiles() {
        if (!isAvailable()) return Collections.emptyList();
        try {
            String query = String.format("'%s' in parents and trashed = false", folderId);
            FileList result = driveClient.files().list()
                    .setQ(query)
                    .setFields("files(id, name, size, mimeType, modifiedTime)")
                    .setSupportsAllDrives(true)
                    .setIncludeItemsFromAllDrives(true)
                    .setPageSize(500)
                    .execute();
            return result.getFiles() != null ? result.getFiles() : Collections.emptyList();
        } catch (Exception e) {
            log.warn("Error listing files in Google Drive folder {}: {}", folderId, e.getMessage());
            return Collections.emptyList();
        }
    }

    public String getFolderId() {
        return this.folderId;
    }

    /**
     * Comprehensive diagnostics for health and status endpoints.
     */
    public Map<String, Object> getStorageDetails() {
        Map<String, Object> details = new java.util.LinkedHashMap<>();
        details.put("enabled", enabled);
        details.put("isReady", isReady);
        details.put("folderId", folderId);
        details.put("driveClientConnected", driveClient != null);

        if (isAvailable()) {
            try {
                File folder = driveClient.files().get(folderId)
                        .setFields("id, name, driveId")
                        .setSupportsAllDrives(true)
                        .execute();
                details.put("folderName", folder.getName());
                details.put("status", "ACTIVE_AND_SYNCHRONIZED");
            } catch (Exception e) {
                details.put("status", "CONNECTED_WITH_WARNING: " + e.getMessage());
            }
        } else {
            details.put("status", enabled ? "DISCONNECTED_OR_MISSING_CREDENTIALS" : "DISABLED");
        }
        return details;
    }
}
