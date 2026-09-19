package com.scribd.clone.repository;

import com.scribd.clone.model.Video;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VideoRepository extends JpaRepository<Video, Long> {
    List<Video> findAllByOrderByCreatedAtDesc();
    List<Video> findByCategoryIgnoreCase(String category);
}
