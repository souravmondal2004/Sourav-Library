package com.scribd.clone.dto;

import com.scribd.clone.model.ReadingHistory;
import java.time.LocalDateTime;

public class UserActivityDto {
    private Long id;
    private Long userId;
    private String username;
    private String userEmail;
    private String fullName;
    private Long documentId;
    private String documentTitle;
    private String documentAuthor;
    private String categoryName;
    private Integer lastPage;
    private Double progressPercent;
    private LocalDateTime lastReadAt;

    public UserActivityDto() {}

    public static UserActivityDto fromEntity(ReadingHistory history) {
        UserActivityDto dto = new UserActivityDto();
        dto.setId(history.getId());
        if (history.getUser() != null) {
            dto.setUserId(history.getUser().getId());
            dto.setUsername(history.getUser().getUsername());
            dto.setUserEmail(history.getUser().getEmail());
            dto.setFullName(history.getUser().getFullName());
        }
        if (history.getDocument() != null) {
            dto.setDocumentId(history.getDocument().getId());
            dto.setDocumentTitle(history.getDocument().getTitle());
            dto.setDocumentAuthor(history.getDocument().getAuthor());
            if (history.getDocument().getCategory() != null) {
                dto.setCategoryName(history.getDocument().getCategory().getName());
            }
        }
        dto.setLastPage(history.getLastPage());
        dto.setProgressPercent(history.getProgressPercent());
        dto.setLastReadAt(history.getLastReadAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }

    public String getDocumentTitle() { return documentTitle; }
    public void setDocumentTitle(String documentTitle) { this.documentTitle = documentTitle; }

    public String getDocumentAuthor() { return documentAuthor; }
    public void setDocumentAuthor(String documentAuthor) { this.documentAuthor = documentAuthor; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public Integer getLastPage() { return lastPage; }
    public void setLastPage(Integer lastPage) { this.lastPage = lastPage; }

    public Double getProgressPercent() { return progressPercent; }
    public void setProgressPercent(Double progressPercent) { this.progressPercent = progressPercent; }

    public LocalDateTime getLastReadAt() { return lastReadAt; }
    public void setLastReadAt(LocalDateTime lastReadAt) { this.lastReadAt = lastReadAt; }
}
