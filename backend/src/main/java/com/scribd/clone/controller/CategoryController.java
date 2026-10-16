package com.scribd.clone.controller;

import com.scribd.clone.dto.CategoryDto;
import com.scribd.clone.model.Category;
import com.scribd.clone.service.CategoryService;
import com.scribd.clone.service.CategorySyncService;
import com.scribd.clone.service.GoogleDriveStorageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;
    private final CategorySyncService categorySyncService;
    private final GoogleDriveStorageService googleDriveStorageService;

    public CategoryController(
            CategoryService categoryService,
            CategorySyncService categorySyncService,
            GoogleDriveStorageService googleDriveStorageService
    ) {
        this.categoryService = categoryService;
        this.categorySyncService = categorySyncService;
        this.googleDriveStorageService = googleDriveStorageService;
    }

    @GetMapping
    public ResponseEntity<List<Category>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAllCategories());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Category> getCategoryById(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.getCategoryById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<Category> createCategory(@Valid @RequestBody CategoryDto dto) {
        return ResponseEntity.ok(categoryService.createCategory(dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.ok(Map.of("message", "Category deleted successfully and synced with Google Drive"));
    }

    /**
     * Explicit Cloud Auto-Sync trigger endpoint for Categories.
     * Restores any missing categories from Google Drive and pushes the latest catalog.
     */
    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> syncWithGoogleDrive() {
        int restored = categorySyncService != null ? categorySyncService.restoreCategoriesFromGoogleDrive() : 0;
        boolean synced = categorySyncService != null && categorySyncService.syncCategoriesToGoogleDrive();
        int total = categoryService.getAllCategories().size();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "SUCCESS");
        result.put("message", "Category catalog synchronized with Google Drive cloud storage.");
        result.put("googleDriveConnected", googleDriveStorageService != null && googleDriveStorageService.isAvailable());
        result.put("restoredCount", restored);
        result.put("totalCategories", total);
        result.put("syncedToDrive", synced);

        return ResponseEntity.ok(result);
    }
}
