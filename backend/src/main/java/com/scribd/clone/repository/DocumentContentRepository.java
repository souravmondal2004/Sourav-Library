package com.scribd.clone.repository;

import com.scribd.clone.model.DocumentContent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface DocumentContentRepository extends JpaRepository<DocumentContent, Long> {

    Optional<DocumentContent> findByFileName(String fileName);

    boolean existsByFileName(String fileName);

    @Transactional
    void deleteByFileName(String fileName);
}
