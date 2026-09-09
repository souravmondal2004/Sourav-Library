package com.scribd.clone.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "READING_HISTORY", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "document_id"})
})
public class ReadingHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @Column(name = "last_page", nullable = false)
    private Integer lastPage = 1;

    @Column(name = "progress_percent")
    private Double progressPercent = 0.0;

    @Column(name = "last_read_at", nullable = false)
    private LocalDateTime lastReadAt = LocalDateTime.now();

    public ReadingHistory() {}

    public ReadingHistory(User user, Document document, Integer lastPage, Double progressPercent) {
        this.user = user;
        this.document = document;
        this.lastPage = lastPage;
        this.progressPercent = progressPercent;
        this.lastReadAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Document getDocument() { return document; }
    public void setDocument(Document document) { this.document = document; }

    public Integer getLastPage() { return lastPage; }
    public void setLastPage(Integer lastPage) { this.lastPage = lastPage; }

    public Double getProgressPercent() { return progressPercent; }
    public void setProgressPercent(Double progressPercent) { this.progressPercent = progressPercent; }

    public LocalDateTime getLastReadAt() { return lastReadAt; }
    public void setLastReadAt(LocalDateTime lastReadAt) { this.lastReadAt = lastReadAt; }
}
