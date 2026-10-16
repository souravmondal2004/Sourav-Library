package com.scribd.clone.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.scribd.clone.model.Category;
import com.scribd.clone.repository.CategoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

/**
 * Enterprise Category Cloud Sync Service.
 * Automatically synchronizes all book & PDF categories directly with Google Drive
 * folder: 1ZwKXAE2dM9JmJIGl2HZap1RiW9CSeVPS under 'categories_catalog.json'.
 *
 * Guarantees that even if local machine turns off or cloud database restarts,
 * all categories are automatically recovered and preserved forever in Google Drive.
 */
@Service
public class CategorySyncService {

    private static final Logger log = LoggerFactory.getLogger(CategorySyncService.class);
    public static final String CATALOG_FILENAME = "categories_catalog.json";
    private static final Path LOCAL_BACKUP_PATH = Paths.get("data", CATALOG_FILENAME);

    private final CategoryRepository categoryRepository;
    private final GoogleDriveStorageService googleDriveStorageService;
    private final ObjectMapper objectMapper;

    public CategorySyncService(CategoryRepository categoryRepository, GoogleDriveStorageService googleDriveStorageService) {
        this.categoryRepository = categoryRepository;
        this.googleDriveStorageService = googleDriveStorageService;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    @EventListener(ApplicationReadyEvent.class)
    @Order(1)
    public void onApplicationReady() {
        log.info("Initiating Category Cloud Sync with Google Drive...");
        restoreCategoriesFromGoogleDrive();
    }

    /**
     * Pushes current Category list directly into Google Drive folder 1ZwKXAE2dM9JmJIGl2HZap1RiW9CSeVPS
     * and maintains a local offline backup copy in data/categories_catalog.json.
     */
    public synchronized boolean syncCategoriesToGoogleDrive() {
        try {
            List<Category> categories = categoryRepository.findAll();
            String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(categories);
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);

            // 1. Save local backup copy on disk
            try {
                if (LOCAL_BACKUP_PATH.getParent() != null) {
                    Files.createDirectories(LOCAL_BACKUP_PATH.getParent());
                }
                Files.write(LOCAL_BACKUP_PATH, bytes);
                log.info("Saved local backup of {} categories to {}", categories.size(), LOCAL_BACKUP_PATH);
            } catch (Exception e) {
                log.warn("Could not save local backup of categories: {}", e.getMessage());
            }

            // 2. Primary: Save directly to Google Drive Folder (Indestructible Cloud Storage)
            if (googleDriveStorageService != null && googleDriveStorageService.isAvailable()) {
                String fileId = googleDriveStorageService.saveOrUpdateFile(CATALOG_FILENAME, bytes, "application/json");
                log.info("✅ Synced {} categories to Google Drive Cloud Storage (File: {}, ID: {})",
                        categories.size(), CATALOG_FILENAME, fileId);
                return true;
            } else {
                log.warn("Google Drive storage not currently available. Saved {} categories to local disk cache only.", categories.size());
                return false;
            }
        } catch (Exception e) {
            log.error("Failed to sync categories to Google Drive: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Reads categories from Google Drive 'categories_catalog.json' and restores any missing entries to the database.
     * If DB has fewer categories than Google Drive catalog, it automatically restores missing ones.
     */
    public synchronized int restoreCategoriesFromGoogleDrive() {
        List<Category> restoredList = null;

        // Tier 1: Restore directly from Google Drive Cloud Storage
        if (googleDriveStorageService != null && googleDriveStorageService.isAvailable()) {
            try {
                byte[] driveBytes = googleDriveStorageService.readFileBytes(CATALOG_FILENAME);
                if (driveBytes != null && driveBytes.length > 0) {
                    restoredList = objectMapper.readValue(driveBytes, new TypeReference<List<Category>>() {});
                    log.info("Loaded {} categories from Google Drive Cloud Storage ('{}')", restoredList.size(), CATALOG_FILENAME);
                }
            } catch (Exception e) {
                log.warn("Could not read {} from Google Drive: {}", CATALOG_FILENAME, e.getMessage());
            }
        }

        // Tier 2: Fallback to local backup on disk if Google Drive had no file or was offline
        if ((restoredList == null || restoredList.isEmpty()) && Files.exists(LOCAL_BACKUP_PATH)) {
            try {
                byte[] localBytes = Files.readAllBytes(LOCAL_BACKUP_PATH);
                restoredList = objectMapper.readValue(localBytes, new TypeReference<List<Category>>() {});
                log.info("Loaded {} categories from local backup ({})", restoredList.size(), LOCAL_BACKUP_PATH);
            } catch (Exception e) {
                log.warn("Could not read local categories backup: {}", e.getMessage());
            }
        }

        if (restoredList == null || restoredList.isEmpty()) {
            // If Google Drive doesn't have categories_catalog.json yet, push current DB categories to create it
            if (categoryRepository.count() > 0) {
                syncCategoriesToGoogleDrive();
            }
            return 0;
        }

        int addedCount = 0;
        for (Category catDto : restoredList) {
            if (catDto.getName() == null || catDto.getName().isBlank()) {
                continue;
            }
            String slug = catDto.getSlug();
            if (slug == null || slug.isBlank()) {
                slug = catDto.getName().toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
            }

            boolean exists = categoryRepository.existsBySlug(slug) || categoryRepository.existsByName(catDto.getName());
            if (!exists) {
                Category newCat = new Category(
                        catDto.getName(),
                        slug,
                        catDto.getDescription(),
                        catDto.getIcon() != null ? catDto.getIcon() : "book"
                );
                categoryRepository.save(newCat);
                addedCount++;
                log.info("Restored category from Google Drive: '{}' (slug: {})", catDto.getName(), slug);
            }
        }

        log.info("Category Cloud Sync Complete! Restored {} categories into database.", addedCount);

        // Update Google Drive with the combined latest state
        syncCategoriesToGoogleDrive();

        return addedCount;
    }
}
