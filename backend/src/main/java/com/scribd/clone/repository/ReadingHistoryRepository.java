package com.scribd.clone.repository;

import com.scribd.clone.model.ReadingHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReadingHistoryRepository extends JpaRepository<ReadingHistory, Long> {
    List<ReadingHistory> findByUserIdOrderByLastReadAtDesc(Long userId);
    Optional<ReadingHistory> findByUserIdAndDocumentId(Long userId, Long documentId);
    List<ReadingHistory> findAllByOrderByLastReadAtDesc();
    long countByUserId(Long userId);
}
