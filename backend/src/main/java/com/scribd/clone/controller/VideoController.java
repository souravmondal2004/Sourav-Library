package com.scribd.clone.controller;

import com.scribd.clone.model.Video;
import com.scribd.clone.repository.VideoRepository;
import com.scribd.clone.service.GoogleDriveStorageService;
import com.scribd.clone.service.VideoSyncService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/videos")
public class VideoController {

    private final VideoRepository videoRepository;
    private final VideoSyncService videoSyncService;
    private final GoogleDriveStorageService googleDriveStorageService;

    public VideoController(
            VideoRepository videoRepository,
            VideoSyncService videoSyncService,
            GoogleDriveStorageService googleDriveStorageService
    ) {
        this.videoRepository = videoRepository;
        this.videoSyncService = videoSyncService;
        this.googleDriveStorageService = googleDriveStorageService;
    }

    @GetMapping
    public ResponseEntity<List<Video>> getAllVideos(@RequestParam(required = false) String category) {
        if (videoRepository.count() == 0) {
            videoSyncService.restoreVideosFromGoogleDrive();
        }

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
        
        // Asynchronously or immediately push updated catalog to Google Drive
        videoSyncService.syncVideosToGoogleDrive();

        return ResponseEntity.ok(saved);
    }

    /**
     * Explicit Cloud Auto-Sync trigger endpoint.
     * Restores any missing videos from Google Drive and pushes the latest catalog.
     */
    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> syncWithGoogleDrive() {
        int restored = videoSyncService.restoreVideosFromGoogleDrive();
        boolean synced = videoSyncService.syncVideosToGoogleDrive();
        long total = videoRepository.count();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "SUCCESS");
        result.put("message", "Video catalog synchronized with Google Drive cloud storage.");
        result.put("googleDriveConnected", googleDriveStorageService != null && googleDriveStorageService.isAvailable());
        result.put("folderId", googleDriveStorageService != null ? googleDriveStorageService.getFolderId() : null);
        result.put("restoredCount", restored);
        result.put("totalVideos", total);
        result.put("syncedToDrive", synced);

        return ResponseEntity.ok(result);
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
            // Re-sync updated catalog to Google Drive immediately
            videoSyncService.syncVideosToGoogleDrive();
            return ResponseEntity.ok(Map.of("message", "Video deleted successfully and synced to Google Drive"));
        }
        return ResponseEntity.notFound().build();
    }
}
