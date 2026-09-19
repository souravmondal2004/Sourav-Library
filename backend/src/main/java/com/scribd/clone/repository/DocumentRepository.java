package com.scribd.clone.repository;

import com.scribd.clone.model.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    boolean existsByFileName(String fileName);

    boolean existsByTitle(String title);

    // Public active catalog queries
    Page<Document> findByIsPublishedTrue(Pageable pageable);

    List<Document> findTop8ByIsPublishedTrueAndIsFeaturedTrueOrderByCreatedAtDesc();

    List<Document> findTop10ByIsPublishedTrueOrderByViewCountDesc();

    Page<Document> findByCategoryIdAndIsPublishedTrue(Long categoryId, Pageable pageable);

    Page<Document> findByIsPublishedTrueAndTitleContainingIgnoreCaseOrIsPublishedTrueAndAuthorContainingIgnoreCaseOrIsPublishedTrueAndDescriptionContainingIgnoreCase(
            String title, String author, String description, Pageable pageable
    );

    Page<Document> findByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCase(
            String title, String author, Pageable pageable
    );

    long countByIsPublishedTrue();

    @Query("SELECT COALESCE(SUM(d.fileSize), 0) FROM Document d")
    Long getTotalStorageUsed();

    @Query("SELECT COALESCE(SUM(d.viewCount), 0) FROM Document d")
    Long getTotalViews();

    @Query("SELECT COALESCE(SUM(d.downloadCount), 0) FROM Document d")
    Long getTotalDownloads();
}
