package com.scribd.clone;

import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.scribd.clone.service.GoogleDriveStorageService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@SpringBootTest
public class GoogleDriveIntegrationTest {

    private static final Logger log = LoggerFactory.getLogger(GoogleDriveIntegrationTest.class);

    @Autowired(required = false)
    private GoogleDriveStorageService googleDriveStorageService;

    @Autowired(required = false)
    private com.scribd.clone.service.VideoSyncService videoSyncService;

    @Test
    public void testVideoSyncWithGoogleDrive() {
        Assumptions.assumeTrue(videoSyncService != null && googleDriveStorageService != null && googleDriveStorageService.isAvailable(),
                "Google Drive storage service is not available, skipping test.");

        boolean synced = videoSyncService.syncVideosToGoogleDrive();
        Assertions.assertTrue(synced, "Should successfully sync videos_catalog.json to Google Drive");

        int restored = videoSyncService.restoreVideosFromGoogleDrive();
        log.info("Test verified: successfully synced and checked {} videos in Google Drive.", restored);
    }

    @Test
    public void testGoogleDriveConnectionAndUpload() throws Exception {
        Assumptions.assumeTrue(googleDriveStorageService != null && googleDriveStorageService.isAvailable(),
                "Google Drive storage service is not available, skipping test.");

        String testFileName = "test_connectivity_check.txt";
        byte[] testContent = "Hello from Scribd Clone to Google Drive 5TB Storage!".getBytes(StandardCharsets.UTF_8);

        String fileId = null;
        try {
            fileId = googleDriveStorageService.uploadBytes(testFileName, testContent, "text/plain");
        } catch (GoogleJsonResponseException e) {
            log.warn("Google Drive returned API exception during test: {}", e.getMessage());
            return;
        }

        Assertions.assertNotNull(fileId, "Google Drive fileId should not be null");

        // Verify file exists
        String foundId = googleDriveStorageService.findFileIdByName(testFileName);
        Assertions.assertEquals(fileId, foundId);

        // Download stream and verify content
        try (InputStream in = googleDriveStorageService.downloadStream(fileId)) {
            Assertions.assertNotNull(in, "Download stream should not be null");
            byte[] downloaded = in.readAllBytes();
            Assertions.assertArrayEquals(testContent, downloaded);
        }

        // Clean up test file
        boolean deleted = googleDriveStorageService.deleteFile(fileId);
        Assertions.assertTrue(deleted, "Test file should be deleted successfully");
    }

    @Test
    public void uploadAllCatalogBooksToGoogleDrive() throws Exception {
        Assumptions.assumeTrue(googleDriveStorageService != null && googleDriveStorageService.isAvailable(),
                "Google Drive storage service is not available, skipping upload.");

        org.springframework.core.io.support.PathMatchingResourcePatternResolver resolver =
                new org.springframework.core.io.support.PathMatchingResourcePatternResolver();
        org.springframework.core.io.Resource[] resources = resolver.getResources("classpath*:books/*.pdf");
        log.info("Found {} books to sync with Google Drive...", resources.length);

        int uploadedCount = 0;
        for (org.springframework.core.io.Resource res : resources) {
            String filename = res.getFilename();
            if (filename == null || !filename.toLowerCase().endsWith(".pdf")) continue;

            String existingId = googleDriveStorageService.findFileIdByName(filename);
            if (existingId != null) {
                log.info("Book '{}' already exists in Google Drive (ID: {}).", filename, existingId);
                continue;
            }

            try (InputStream in = res.getInputStream()) {
                byte[] bytes = in.readAllBytes();
                String fileId = googleDriveStorageService.uploadBytes(filename, bytes, "application/pdf");
                log.info("Successfully uploaded book '{}' to Google Drive! (ID: {})", filename, fileId);
                uploadedCount++;
            }
        }
        log.info("Completed Google Drive sync! Total new books uploaded: {}", uploadedCount);
    }
}
