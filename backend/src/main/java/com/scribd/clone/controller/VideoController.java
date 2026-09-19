package com.scribd.clone.controller;

import com.scribd.clone.model.Video;
import com.scribd.clone.repository.VideoRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/videos")
public class VideoController {

    private final VideoRepository videoRepository;

    public VideoController(VideoRepository videoRepository) {
        this.videoRepository = videoRepository;
    }

    @GetMapping
    public ResponseEntity<List<Video>> getAllVideos(@RequestParam(required = false) String category) {
        if (category != null && !category.isBlank() && !"All".equalsIgnoreCase(category)) {
            return ResponseEntity.ok(videoRepository.findByCategoryIgnoreCase(category));
        }
        return ResponseEntity.ok(videoRepository.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Video> getVideoById(@PathVariable Long id) {
        return videoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Video> createVideo(@RequestBody Video video) {
        if (video.getTitle() == null || video.getTitle().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        Video saved = videoRepository.save(video);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{id}/view")
    public ResponseEntity<Map<String, Object>> incrementView(@PathVariable Long id) {
        return videoRepository.findById(id)
                .map(video -> {
                    video.setViewCount((video.getViewCount() == null ? 0L : video.getViewCount()) + 1);
                    videoRepository.save(video);
                    return ResponseEntity.ok(Map.<String, Object>of("views", video.getViewCount()));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(@PathVariable Long id) {
        return videoRepository.findById(id)
                .map(video -> {
                    long currentLikes = video.getLikeCount() == null ? 0L : video.getLikeCount();
                    video.setLikeCount(currentLikes + 1);
                    videoRepository.save(video);
                    return ResponseEntity.ok(Map.<String, Object>of("likes", video.getLikeCount()));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteVideo(@PathVariable Long id) {
        if (videoRepository.existsById(id)) {
            videoRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Video deleted successfully"));
        }
        return ResponseEntity.notFound().build();
    }
}
