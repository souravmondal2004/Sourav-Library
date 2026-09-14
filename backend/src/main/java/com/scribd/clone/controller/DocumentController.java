package com.scribd.clone.controller;

import com.scribd.clone.dto.DocumentResponseDto;
import com.scribd.clone.model.Document;
import com.scribd.clone.service.DocumentService;
import com.scribd.clone.service.FileStorageService;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final FileStorageService fileStorageService;

    public DocumentController(DocumentService documentService, FileStorageService fileStorageService) {
        this.documentService = documentService;
        this.fileStorageService = fileStorageService;
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
}
