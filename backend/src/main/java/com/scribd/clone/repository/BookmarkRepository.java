package com.scribd.clone.repository;

import com.scribd.clone.model.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {
    List<Bookmark> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<Bookmark> findByUserIdAndDocumentId(Long userId, Long documentId);
    boolean existsByUserIdAndDocumentId(Long userId, Long documentId);
    void deleteByUserIdAndDocumentId(Long userId, Long documentId);
}
