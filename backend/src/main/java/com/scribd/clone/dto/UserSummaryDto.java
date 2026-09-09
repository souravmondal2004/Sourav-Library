package com.scribd.clone.dto;

import com.scribd.clone.model.User;
import java.time.LocalDateTime;

public class UserSummaryDto {
    private Long id;
    private String username;
    private String email;
    private String role;
    private String fullName;
    private LocalDateTime createdAt;
    private long booksReadCount;

    public UserSummaryDto() {}

    public UserSummaryDto(User user, long booksReadCount) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.role = user.getRole();
        this.fullName = user.getFullName() != null ? user.getFullName() : user.getUsername();
        this.createdAt = user.getCreatedAt();
        this.booksReadCount = booksReadCount;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public long getBooksReadCount() { return booksReadCount; }
    public void setBooksReadCount(long booksReadCount) { this.booksReadCount = booksReadCount; }
}
