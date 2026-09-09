package com.scribd.clone.dto;

import com.scribd.clone.model.Document;
import java.time.LocalDateTime;

public class DocumentResponseDto {
    private Long id;
    private String title;
    private String author;
    private String description;
    private Long categoryId;
    private String categoryName;
    private String categorySlug;
    private String fileName;
    private String originalFilename;
    private Long fileSize;
    private String fileType;
    private String coverImagePath;
    private Integer pageCount;
    private String language;
    private Integer publishedYear;
    private Boolean isFeatured;
    private Boolean isPublished;
    private Long viewCount;
    private Long downloadCount;
    private String uploadedByUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public DocumentResponseDto() {}

    public static DocumentResponseDto fromEntity(Document doc) {
        DocumentResponseDto dto = new DocumentResponseDto();
        dto.setId(doc.getId());
        dto.setTitle(doc.getTitle());
        dto.setAuthor(doc.getAuthor());
        dto.setDescription(doc.getDescription());
        if (doc.getCategory() != null) {
            dto.setCategoryId(doc.getCategory().getId());
            dto.setCategoryName(doc.getCategory().getName());
            dto.setCategorySlug(doc.getCategory().getSlug());
        }
        dto.setFileName(doc.getFileName());
        dto.setOriginalFilename(doc.getOriginalFilename());
        dto.setFileSize(doc.getFileSize());
        dto.setFileType(doc.getFileType());
        dto.setCoverImagePath(doc.getCoverImagePath());
        dto.setPageCount(doc.getPageCount());
        dto.setLanguage(doc.getLanguage());
        dto.setPublishedYear(doc.getPublishedYear());
        dto.setIsFeatured(doc.getIsFeatured());
        dto.setIsPublished(doc.getIsPublished());
        dto.setViewCount(doc.getViewCount());
        dto.setDownloadCount(doc.getDownloadCount());
        if (doc.getUploadedBy() != null) {
            dto.setUploadedByUsername(doc.getUploadedBy().getUsername());
        }
        dto.setCreatedAt(doc.getCreatedAt());
        dto.setUpdatedAt(doc.getUpdatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    public String getCategorySlug() { return categorySlug; }
    public void setCategorySlug(String categorySlug) { this.categorySlug = categorySlug; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getOriginalFilename() { return originalFilename; }
    public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }
    public String getCoverImagePath() { return coverImagePath; }
    public void setCoverImagePath(String coverImagePath) { this.coverImagePath = coverImagePath; }
    public Integer getPageCount() { return pageCount; }
    public void setPageCount(Integer pageCount) { this.pageCount = pageCount; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public Integer getPublishedYear() { return publishedYear; }
    public void setPublishedYear(Integer publishedYear) { this.publishedYear = publishedYear; }
    public Boolean getIsFeatured() { return isFeatured; }
    public void setIsFeatured(Boolean isFeatured) { this.isFeatured = isFeatured; }
    public Boolean getIsPublished() { return isPublished; }
    public void setIsPublished(Boolean isPublished) { this.isPublished = isPublished; }
    public Long getViewCount() { return viewCount; }
    public void setViewCount(Long viewCount) { this.viewCount = viewCount; }
    public Long getDownloadCount() { return downloadCount; }
    public void setDownloadCount(Long downloadCount) { this.downloadCount = downloadCount; }
    public String getUploadedByUsername() { return uploadedByUsername; }
    public void setUploadedByUsername(String uploadedByUsername) { this.uploadedByUsername = uploadedByUsername; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
