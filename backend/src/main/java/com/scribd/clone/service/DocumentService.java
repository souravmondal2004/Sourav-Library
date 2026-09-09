package com.scribd.clone.service;

import com.scribd.clone.dto.DocumentResponseDto;
import com.scribd.clone.model.Document;
import com.scribd.clone.repository.DocumentRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;

    public DocumentService(DocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
    }

    public Page<DocumentResponseDto> getPublishedDocuments(int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return documentRepository.findByIsPublishedTrue(pageable).map(DocumentResponseDto::fromEntity);
    }

    public List<DocumentResponseDto> getFeaturedDocuments() {
        return documentRepository.findTop8ByIsPublishedTrueAndIsFeaturedTrueOrderByCreatedAtDesc()
                .stream().map(DocumentResponseDto::fromEntity).collect(Collectors.toList());
    }

    public List<DocumentResponseDto> getPopularDocuments() {
        return documentRepository.findTop10ByIsPublishedTrueOrderByViewCountDesc()
                .stream().map(DocumentResponseDto::fromEntity).collect(Collectors.toList());
    }

    public Page<DocumentResponseDto> getDocumentsByCategory(Long categoryId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return documentRepository.findByCategoryIdAndIsPublishedTrue(categoryId, pageable)
                .map(DocumentResponseDto::fromEntity);
    }

    public Page<DocumentResponseDto> searchDocuments(String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        String cleanQuery = (query != null) ? query.trim() : "";
        if (cleanQuery.isEmpty()) {
            return getPublishedDocuments(page, size, "createdAt", "desc");
        }

        Page<Document> result = documentRepository
                .findByIsPublishedTrueAndTitleContainingIgnoreCaseOrIsPublishedTrueAndAuthorContainingIgnoreCaseOrIsPublishedTrueAndDescriptionContainingIgnoreCase(
                        cleanQuery, cleanQuery, cleanQuery, pageable
                );

        // Fallback: If exact phrase search returns 0 items, search by major keywords (> 2 chars)
        if (result.isEmpty() && cleanQuery.contains(" ")) {
            String[] words = cleanQuery.split("\\s+");
            for (String word : words) {
                String w = word.replaceAll("[^a-zA-Z0-9]", "").trim();
                if (w.length() > 2 && !w.equalsIgnoreCase("and") && !w.equalsIgnoreCase("the") && !w.equalsIgnoreCase("for") && !w.equalsIgnoreCase("of")) {
                    Page<Document> wordResult = documentRepository
                            .findByIsPublishedTrueAndTitleContainingIgnoreCaseOrIsPublishedTrueAndAuthorContainingIgnoreCaseOrIsPublishedTrueAndDescriptionContainingIgnoreCase(
                                    w, w, w, pageable
                            );
                    if (!wordResult.isEmpty()) {
                        return wordResult.map(DocumentResponseDto::fromEntity);
                    }
                }
            }
        }

        return result.map(DocumentResponseDto::fromEntity);
    }

    @Transactional
    public DocumentResponseDto getDocumentDetails(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with id: " + id));

        // Increment view count on open
        document.setViewCount(document.getViewCount() + 1);
        documentRepository.save(document);

        return DocumentResponseDto.fromEntity(document);
    }

    public Document getDocumentEntity(Long id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with id: " + id));
    }

    @Transactional
    public void recordDownload(Long id) {
        Document document = getDocumentEntity(id);
        document.setDownloadCount(document.getDownloadCount() + 1);
        documentRepository.save(document);
    }
}
