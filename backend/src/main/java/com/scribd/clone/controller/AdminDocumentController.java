package com.scribd.clone.controller;

import com.scribd.clone.dto.AdminStatsDto;
import com.scribd.clone.dto.DocumentResponseDto;
import com.scribd.clone.dto.DocumentUpdateDto;
import com.scribd.clone.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminDocumentController {

    private final AdminService adminService;

    public AdminDocumentController(AdminService adminService) {
        this.adminService = adminService;
    }

    /**
     * Get paginated documents for admin management table with search and category filters.
     */
    @GetMapping("/documents")
    public ResponseEntity<Page<DocumentResponseDto>> getAdminDocuments(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(adminService.getAdminDocuments(query, categoryId, page, size));
    }

    /**
     * Dedicated Admin Upload Channel for Books & PDFs.
     * Supports multipart upload for the document and optional cover image.
     */
    @PostMapping(value = "/documents/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponseDto> uploadDocument(
            @RequestParam("file") MultipartFile pdfFile,
            @RequestParam(value = "cover", required = false) MultipartFile coverFile,
            @RequestParam("title") String title,
            @RequestParam("author") String author,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("categoryId") Long categoryId,
            @RequestParam(value = "pageCount", required = false) Integer pageCount,
            @RequestParam(value = "language", required = false) String language,
            @RequestParam(value = "publishedYear", required = false) Integer publishedYear,
            @RequestParam(value = "isFeatured", defaultValue = "false") Boolean isFeatured,
            @RequestParam(value = "isPublished", defaultValue = "true") Boolean isPublished,
            Authentication authentication
    ) throws IOException {

        String username = authentication.getName();
        DocumentResponseDto response = adminService.uploadDocument(
                pdfFile,
                coverFile,
                title,
                author,
                description,
                categoryId,
                pageCount,
                language,
                publishedYear,
                isFeatured,
                isPublished,
                username
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Update metadata of an existing document.
     */
    @PutMapping("/documents/{id}")
    public ResponseEntity<DocumentResponseDto> updateDocument(
            @PathVariable Long id,
            @Valid @RequestBody DocumentUpdateDto dto
    ) {
        return ResponseEntity.ok(adminService.updateDocument(id, dto));
    }

    /**
     * Toggle document visibility (Publish / Unpublish).
     */
    @PatchMapping("/documents/{id}/toggle-publish")
    public ResponseEntity<DocumentResponseDto> togglePublish(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.togglePublished(id));
    }

    /**
     * Toggle featured status for homepage showcase.
     */
    @PatchMapping("/documents/{id}/toggle-featured")
    public ResponseEntity<DocumentResponseDto> toggleFeatured(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.toggleFeatured(id));
    }

    /**
     * Delete document and its files.
     */
    @DeleteMapping("/documents/{id}")
    public ResponseEntity<?> deleteDocument(@PathVariable Long id) {
        adminService.deleteDocument(id);
        return ResponseEntity.ok(Map.of("message", "Document deleted successfully"));
    }

    /**
     * Admin Channel Overview & Storage Analytics.
     */
    @GetMapping("/stats")
    public ResponseEntity<AdminStatsDto> getAdminStats() {
        return ResponseEntity.ok(adminService.getAdminStats());
    }

    /**
     * Admin Panel: User Activity & Book Reading Logs (Who read which PDF/book).
     */
    @GetMapping("/user-activity")
    public ResponseEntity<java.util.List<com.scribd.clone.dto.UserActivityDto>> getUserActivity() {
        return ResponseEntity.ok(adminService.getUserActivityLogs());
    }

    /**
     * Admin Panel: List of all registered users and stats.
     */
    @GetMapping("/users")
    public ResponseEntity<java.util.List<com.scribd.clone.dto.UserSummaryDto>> getUsers() {
        return ResponseEntity.ok(adminService.getAllUsersSummary());
    }
}
