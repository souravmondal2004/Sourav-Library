package com.scribd.clone.controller;

import com.scribd.clone.dto.DocumentResponseDto;
import com.scribd.clone.model.Document;
import com.scribd.clone.service.DocumentService;
import com.scribd.clone.service.FileStorageService;
import com.scribd.clone.service.AdminService;
import com.scribd.clone.service.DocumentSyncService;
import com.scribd.clone.service.GoogleDriveStorageService;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final FileStorageService fileStorageService;
    private final AdminService adminService;
    private final DocumentSyncService documentSyncService;
    private final GoogleDriveStorageService googleDriveStorageService;

    public DocumentController(
            DocumentService documentService,
            FileStorageService fileStorageService,
            AdminService adminService,
            DocumentSyncService documentSyncService,
            GoogleDriveStorageService googleDriveStorageService
    ) {
        this.documentService = documentService;
        this.fileStorageService = fileStorageService;
        this.adminService = adminService;
        this.documentSyncService = documentSyncService;
        this.googleDriveStorageService = googleDriveStorageService;
    }

    @GetMapping
    public ResponseEntity<Page<DocumentResponseDto>> getDocuments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        return ResponseEntity.ok(documentService.getPublishedDocuments(page, size, sortBy, sortDir));
    }

    @GetMapping("/featured")
    public ResponseEntity<List<DocumentResponseDto>> getFeaturedDocuments() {
        return ResponseEntity.ok(documentService.getFeaturedDocuments());
    }

    @GetMapping("/popular")
    public ResponseEntity<List<DocumentResponseDto>> getPopularDocuments() {
        return ResponseEntity.ok(documentService.getPopularDocuments());
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<Page<DocumentResponseDto>> getDocumentsByCategory(
            @PathVariable Long categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return ResponseEntity.ok(documentService.getDocumentsByCategory(categoryId, page, size));
    }

    @GetMapping("/search")
    public ResponseEntity<Page<DocumentResponseDto>> searchDocuments(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return ResponseEntity.ok(documentService.searchDocuments(q, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponseDto> getDocumentDetails(@PathVariable Long id) {
        return ResponseEntity.ok(documentService.getDocumentDetails(id));
    }

    /**
     * Inline PDF Streaming endpoint with Range support for the Scribd Reader.
     */
    @GetMapping("/{id}/stream")
    public ResponseEntity<Resource> streamDocument(@PathVariable Long id) throws IOException {
        Document doc = documentService.getDocumentEntity(id);
        Resource resource = fileStorageService.loadDocumentAsResource(doc.getFileName(), doc);

        if (resource == null || !resource.exists()) {
            return ResponseEntity.notFound().build();
        }

        long length = 0;
        try {
            length = resource.contentLength();
        } catch (IOException ignored) {}

        var responseBuilder = ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.getOriginalFilename() + "\"")
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400, stale-while-revalidate=604800")
                .header("Access-Control-Expose-Headers", "Accept-Ranges, Content-Range, Content-Length, Content-Disposition, ETag");

        if (length > 0) {
            responseBuilder.contentLength(length);
            responseBuilder.eTag("\"doc-" + id + "-" + length + "\"");
        }

        return responseBuilder.body(resource);
    }

    /**
     * Download document endpoint.
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadDocument(@PathVariable Long id) {
        Document doc = documentService.getDocumentEntity(id);
        documentService.recordDownload(id);
        Resource resource = fileStorageService.loadDocumentAsResource(doc.getFileName(), doc);

        if (resource == null || !resource.exists()) {
            return ResponseEntity.notFound().build();
        }

        var responseBuilder = ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getOriginalFilename() + "\"");

        try {
            long length = resource.contentLength();
            if (length > 0) {
                responseBuilder.contentLength(length);
            }
        } catch (IOException ignored) {}

        return responseBuilder.body(resource);
    }

    /**
     * Book Cover image endpoint.
     */
    @GetMapping("/{id}/cover")
    public ResponseEntity<Resource> getCoverImage(@PathVariable Long id) {
        Document doc = documentService.getDocumentEntity(id);
        Resource resource = fileStorageService.loadCoverForDocument(doc);
        if (resource != null && resource.exists()) {
            String contentType = "image/png";
            if (doc.getCoverImagePath() != null) {
                if (doc.getCoverImagePath().endsWith(".jpg") || doc.getCoverImagePath().endsWith(".jpeg")) contentType = "image/jpeg";
                else if (doc.getCoverImagePath().endsWith(".webp")) contentType = "image/webp";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .body(resource);
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Direct PDF Upload Channel from the PDF Section.
     * Stores PDF to local cache, Google Drive Cloud Storage (5TB), and updates documents_catalog.json.
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponseDto> uploadDocument(
            @RequestParam("file") MultipartFile pdfFile,
            @RequestParam(value = "cover", required = false) MultipartFile coverFile,
            @RequestParam("title") String title,
            @RequestParam("author") String author,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "categoryId", required = false) Long categoryId,
            @RequestParam(value = "pageCount", required = false) Integer pageCount,
            @RequestParam(value = "language", required = false) String language,
            @RequestParam(value = "publishedYear", required = false) Integer publishedYear,
            @RequestParam(value = "isFeatured", defaultValue = "false") Boolean isFeatured,
            @RequestParam(value = "isPublished", defaultValue = "true") Boolean isPublished,
            Authentication authentication
    ) throws IOException {
        String username = (authentication != null && authentication.getName() != null) ? authentication.getName() : "Sourav";
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
        if (documentSyncService != null) {
            documentSyncService.syncDocumentsToGoogleDrive();
        }
        return ResponseEntity.ok(response);
    }

    /**
     * Delete Document endpoint directly accessible from the PDF section.
     * Deletes from database, disk cache, Google Drive, and updates documents_catalog.json.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteDocument(@PathVariable Long id) {
        adminService.deleteDocument(id);
        if (documentSyncService != null) {
            documentSyncService.syncDocumentsToGoogleDrive();
        }
        return ResponseEntity.ok(Map.of("message", "Document deleted successfully and synced to Google Drive"));
    }

    /**
     * Explicit Cloud Auto-Sync trigger endpoint for Documents / PDFs.
     * Restores missing documents from Google Drive and pushes the latest catalog.
     */
    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> syncWithGoogleDrive() {
        int restored = documentSyncService != null ? documentSyncService.restoreDocumentsFromGoogleDrive() : 0;
        boolean synced = documentSyncService != null && documentSyncService.syncDocumentsToGoogleDrive();
        long total = documentService.getPublishedDocuments(0, 1, "id", "asc").getTotalElements();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "SUCCESS");
        result.put("message", "Document catalog synchronized with Google Drive cloud storage.");
        result.put("googleDriveConnected", googleDriveStorageService != null && googleDriveStorageService.isAvailable());
        result.put("folderId", googleDriveStorageService != null ? googleDriveStorageService.getFolderId() : null);
        result.put("restoredCount", restored);
        result.put("totalDocuments", total);
        result.put("syncedToDrive", synced);

        return ResponseEntity.ok(result);
    }
}
