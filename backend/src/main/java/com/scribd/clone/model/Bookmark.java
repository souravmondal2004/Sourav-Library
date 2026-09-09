package com.scribd.clone.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "BOOKMARKS")
public class Bookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @Column(name = "page_number", nullable = false)
    private Integer pageNumber = 1;

    @Column(length = 500)
    private String note;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Bookmark() {}

    public Bookmark(User user, Document document, Integer pageNumber, String note) {
        this.user = user;
        this.document = document;
        this.pageNumber = pageNumber;
        this.note = note;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Document getDocument() { return document; }
    public void setDocument(Document document) { this.document = document; }

    public Integer getPageNumber() { return pageNumber; }
    public void setPageNumber(Integer pageNumber) { this.pageNumber = pageNumber; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
