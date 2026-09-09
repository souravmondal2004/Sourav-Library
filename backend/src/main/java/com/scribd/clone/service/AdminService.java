package com.scribd.clone.service;

import com.scribd.clone.dto.AdminStatsDto;
import com.scribd.clone.dto.DocumentResponseDto;
import com.scribd.clone.dto.DocumentUpdateDto;
import com.scribd.clone.model.Category;
import com.scribd.clone.model.Document;
import com.scribd.clone.model.User;
import com.scribd.clone.repository.CategoryRepository;
import com.scribd.clone.repository.DocumentRepository;
import com.scribd.clone.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

import com.scribd.clone.dto.UserActivityDto;
import com.scribd.clone.dto.UserSummaryDto;
import com.scribd.clone.repository.ReadingHistoryRepository;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private final DocumentRepository documentRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final ReadingHistoryRepository readingHistoryRepository;
    private final FileStorageService fileStorageService;

    public AdminService(
            DocumentRepository documentRepository,
            CategoryRepository categoryRepository,
            UserRepository userRepository,
            ReadingHistoryRepository readingHistoryRepository,
            FileStorageService fileStorageService
    ) {
        this.documentRepository = documentRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.readingHistoryRepository = readingHistoryRepository;
        this.fileStorageService = fileStorageService;
    }

    public Page<DocumentResponseDto> getAdminDocuments(String query, Long categoryId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        if (query != null && !query.isBlank()) {
            return documentRepository.findByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCase(query.trim(), query.trim(), pageable)
                    .map(DocumentResponseDto::fromEntity);
        } else if (categoryId != null) {
            return documentRepository.findByCategoryIdAndIsPublishedTrue(categoryId, pageable)
                    .map(DocumentResponseDto::fromEntity);
        } else {
            return documentRepository.findAll(pageable)
                    .map(DocumentResponseDto::fromEntity);
        }
    }

    @Transactional
    public DocumentResponseDto uploadDocument(
            MultipartFile pdfFile,
            MultipartFile coverFile,
            String title,
            String author,
            String description,
            Long categoryId,
            Integer pageCount,
            String language,
            Integer publishedYear,
            Boolean isFeatured,
            Boolean isPublished,
            String username
    ) throws IOException {
        if (pdfFile == null || pdfFile.isEmpty()) {
            throw new IllegalArgumentException("PDF file is required");
        }

        User uploader = (username != null ? userRepository.findByUsername(username).orElse(null) : null);
        if (uploader == null) {
            uploader = userRepository.findByRole("ROLE_ADMIN").stream().findFirst()
                    .orElseGet(() -> userRepository.findAll().stream().findFirst()
                            .orElseThrow(() -> new IllegalArgumentException("No user found in database")));
        }

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found with id: " + categoryId));

        // Save PDF file
        String storedFileName = fileStorageService.storeDocument(pdfFile);

        // Calculate pages if not explicitly provided
        int calculatedPages = (pageCount != null && pageCount > 0) 
                ? pageCount 
                : fileStorageService.countPdfPages(storedFileName);

        // Save cover image if provided
        String storedCoverName = null;
        if (coverFile != null && !coverFile.isEmpty()) {
            storedCoverName = fileStorageService.storeCover(coverFile);
        }

        Document document = new Document();
        document.setTitle(title);
        document.setAuthor(author);
        document.setDescription(description);
        document.setCategory(category);
        document.setFileName(storedFileName);
        document.setOriginalFilename(pdfFile.getOriginalFilename());
        document.setFileSize(pdfFile.getSize());
        document.setFileType(pdfFile.getContentType() != null ? pdfFile.getContentType() : "application/pdf");
        document.setCoverImagePath(storedCoverName);
        document.setPageCount(calculatedPages);
        document.setLanguage(language != null && !language.isBlank() ? language : "English");
        document.setPublishedYear(publishedYear);
        document.setIsFeatured(isFeatured != null ? isFeatured : false);
        document.setIsPublished(isPublished != null ? isPublished : true);
        document.setUploadedBy(uploader);

        Document saved = documentRepository.save(document);
        return DocumentResponseDto.fromEntity(saved);
    }

    @Transactional
    public DocumentResponseDto updateDocument(Long id, DocumentUpdateDto dto) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with id: " + id));

        Category category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Category not found with id: " + dto.getCategoryId()));

        document.setTitle(dto.getTitle());
        document.setAuthor(dto.getAuthor());
        document.setDescription(dto.getDescription());
        document.setCategory(category);
        if (dto.getPageCount() != null) document.setPageCount(dto.getPageCount());
        if (dto.getLanguage() != null) document.setLanguage(dto.getLanguage());
        if (dto.getPublishedYear() != null) document.setPublishedYear(dto.getPublishedYear());
        if (dto.getIsFeatured() != null) document.setIsFeatured(dto.getIsFeatured());
        if (dto.getIsPublished() != null) document.setIsPublished(dto.getIsPublished());

        Document saved = documentRepository.save(document);
        return DocumentResponseDto.fromEntity(saved);
    }

    @Transactional
    public DocumentResponseDto togglePublished(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with id: " + id));

        document.setIsPublished(!document.getIsPublished());
        return DocumentResponseDto.fromEntity(documentRepository.save(document));
    }

    @Transactional
    public DocumentResponseDto toggleFeatured(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with id: " + id));

        document.setIsFeatured(!document.getIsFeatured());
        return DocumentResponseDto.fromEntity(documentRepository.save(document));
    }

    @Transactional
    public void deleteDocument(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with id: " + id));

        // Delete physical files
        if (document.getFileName() != null) {
            fileStorageService.deleteDocument(document.getFileName());
        }
        if (document.getCoverImagePath() != null) {
            fileStorageService.deleteCover(document.getCoverImagePath());
        }

        documentRepository.delete(document);
    }

    public AdminStatsDto getAdminStats() {
        long totalDocs = documentRepository.count();
        long publishedDocs = documentRepository.countByIsPublishedTrue();
        long totalViews = documentRepository.getTotalViews();
        long totalDownloads = documentRepository.getTotalDownloads();
        long totalCats = categoryRepository.count();
        long totalUsers = userRepository.count();
        long totalStorage = documentRepository.getTotalStorageUsed();

        return new AdminStatsDto(
                totalDocs,
                publishedDocs,
                totalViews,
                totalDownloads,
                totalCats,
                totalUsers,
                totalStorage,
                formatBytes(totalStorage)
        );
    }

    public List<UserActivityDto> getUserActivityLogs() {
        return readingHistoryRepository.findAllByOrderByLastReadAtDesc()
                .stream()
                .map(UserActivityDto::fromEntity)
                .collect(Collectors.toList());
    }

    public List<UserSummaryDto> getAllUsersSummary() {
        return userRepository.findAll()
                .stream()
                .map(user -> {
                    long readCount = readingHistoryRepository.countByUserId(user.getId());
                    return new UserSummaryDto(user, readCount);
                })
                .collect(Collectors.toList());
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        char pre = "KMGTPE".charAt(exp - 1);
        return String.format("%.1f %sB", bytes / Math.pow(1024, exp), pre);
    }
}
