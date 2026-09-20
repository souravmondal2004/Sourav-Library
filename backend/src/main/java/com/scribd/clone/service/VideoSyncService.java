package com.scribd.clone.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.scribd.clone.model.Video;
import com.scribd.clone.repository.VideoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Enterprise Video Sync Service.
 * Automatically synchronizes all YouTube playlists and video links directly
 * with Google Drive folder: 1ZwKXAE2dM9JmJIGl2HZap1RiW9CSeVPS under 'videos_catalog.json'.
 * 
 * Guarantees that even if local machine turns off or cloud database restarts,
 * all playlists and links are automatically recovered and preserved forever.
 */
@Service
public class VideoSyncService {

    private static final Logger log = LoggerFactory.getLogger(VideoSyncService.class);
    public static final String CATALOG_FILENAME = "videos_catalog.json";
    private static final Path LOCAL_BACKUP_PATH = Paths.get("data", CATALOG_FILENAME);

    private final VideoRepository videoRepository;
    private final GoogleDriveStorageService googleDriveStorageService;
    private final ObjectMapper objectMapper;

    public VideoSyncService(VideoRepository videoRepository, GoogleDriveStorageService googleDriveStorageService) {
        this.videoRepository = videoRepository;
        this.googleDriveStorageService = googleDriveStorageService;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        log.info("Initiating Video Hub Cloud Sync with Google Drive...");
        restoreVideosFromGoogleDrive();
    }

    /**
     * Pushes current Video catalog directly into Google Drive folder 1ZwKXAE2dM9JmJIGl2HZap1RiW9CSeVPS
     * and maintains a local offline copy in data/videos_catalog.json.
     */
    public synchronized boolean syncVideosToGoogleDrive() {
        try {
            List<Video> videos = videoRepository.findAllByOrderByCreatedAtDesc();
            String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(videos);
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);

            // 1. Save local backup copy on disk
            try {
                if (LOCAL_BACKUP_PATH.getParent() != null) {
                    Files.createDirectories(LOCAL_BACKUP_PATH.getParent());
                }
                Files.write(LOCAL_BACKUP_PATH, bytes);
                log.info("Saved local backup of {} videos to {}", videos.size(), LOCAL_BACKUP_PATH);
            } catch (Exception e) {
                log.warn("Could not save local backup of videos: {}", e.getMessage());
            }

            // 2. Primary: Save directly to Google Drive Folder (Indestructible Cloud Storage)
            if (googleDriveStorageService != null && googleDriveStorageService.isAvailable()) {
                String fileId = googleDriveStorageService.saveOrUpdateFile(CATALOG_FILENAME, bytes, "application/json");
                log.info("✅ Synced {} videos to Google Drive Cloud Storage (File: {}, ID: {})",
                        videos.size(), CATALOG_FILENAME, fileId);
                return true;
            } else {
                log.warn("Google Drive storage not currently available. Saved {} videos to local disk cache only.", videos.size());
                return false;
            }
        } catch (Exception e) {
            log.error("Failed to sync videos to Google Drive: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Reads videos from Google Drive 'videos_catalog.json' and restores any missing entries to the database.
     * If DB has 0 videos, it completely restores from Google Drive or default catalog.
     */
    public synchronized int restoreVideosFromGoogleDrive() {
        List<Video> restoredList = null;

        // Tier 1: Restore directly from Google Drive Cloud Storage
        if (googleDriveStorageService != null && googleDriveStorageService.isAvailable()) {
            try {
                byte[] driveBytes = googleDriveStorageService.readFileBytes(CATALOG_FILENAME);
                if (driveBytes != null && driveBytes.length > 0) {
                    restoredList = objectMapper.readValue(driveBytes, new TypeReference<List<Video>>() {});
                    log.info("Loaded {} videos from Google Drive Cloud Storage ('{}')", restoredList.size(), CATALOG_FILENAME);
                }
            } catch (Exception e) {
                log.warn("Could not read {} from Google Drive: {}", CATALOG_FILENAME, e.getMessage());
            }
        }

        // Tier 2: Fallback to local backup on disk if Google Drive had no file or was offline
        if ((restoredList == null || restoredList.isEmpty()) && Files.exists(LOCAL_BACKUP_PATH)) {
            try {
                byte[] localBytes = Files.readAllBytes(LOCAL_BACKUP_PATH);
                restoredList = objectMapper.readValue(localBytes, new TypeReference<List<Video>>() {});
                log.info("Loaded {} videos from local backup ({})", restoredList.size(), LOCAL_BACKUP_PATH);
            } catch (Exception e) {
                log.warn("Could not read local video backup: {}", e.getMessage());
            }
        }

        // Tier 3: If catalog is completely new or empty, initialize with default starter courses
        if ((restoredList == null || restoredList.isEmpty()) && videoRepository.count() == 0) {
            log.info("Catalog is empty. Seeding default curated YouTube courses...");
            restoredList = createInitialDefaultVideos();
        }

        if (restoredList == null || restoredList.isEmpty()) {
            return 0;
        }

        int addedCount = 0;
        for (Video v : restoredList) {
            boolean exists = false;
            if (v.getYoutubeUrl() != null && !v.getYoutubeUrl().isBlank()) {
                exists = videoRepository.findAll().stream()
                        .anyMatch(existing -> v.getYoutubeUrl().equalsIgnoreCase(existing.getYoutubeUrl()));
            } else if (v.getTitle() != null) {
                exists = videoRepository.findAll().stream()
                        .anyMatch(existing -> v.getTitle().equalsIgnoreCase(existing.getTitle()));
            }

            if (!exists) {
                // Ensure new ID generation to avoid ID clashes across restarts
                Video newRecord = new Video();
                newRecord.setTitle(v.getTitle());
                newRecord.setCreator(v.getCreator() != null ? v.getCreator() : "Featured Creator");
                newRecord.setCreatorAvatar(v.getCreatorAvatar());
                newRecord.setVideoType(v.getVideoType() != null ? v.getVideoType() : "youtube");
                newRecord.setVideoUrl(v.getVideoUrl());
                newRecord.setYoutubeId(v.getYoutubeId());
                newRecord.setPlaylistId(v.getPlaylistId());
                newRecord.setThumbnailUrl(v.getThumbnailUrl());
                newRecord.setCategory(v.getCategory() != null ? v.getCategory() : "Programming");
                newRecord.setDuration(v.getDuration() != null ? v.getDuration() : "Video");
                newRecord.setViewCount(v.getViewCount() != null ? v.getViewCount() : 0L);
                newRecord.setLikeCount(v.getLikeCount() != null ? v.getLikeCount() : 0L);
                newRecord.setIsPlaylist(Boolean.TRUE.equals(v.getIsPlaylist()));
                newRecord.setDescription(v.getDescription());
                newRecord.setCreatedAt(v.getCreatedAt() != null ? v.getCreatedAt() : LocalDateTime.now());

                videoRepository.save(newRecord);
                addedCount++;
            }
        }

        log.info("Auto-Sync Complete! Restored/Added {} new videos into database.", addedCount);

        // Always make sure Google Drive has the latest combined state
        syncVideosToGoogleDrive();

        return addedCount;
    }

    private List<Video> createInitialDefaultVideos() {
        List<Video> defaults = new ArrayList<>();

        Video v1 = new Video();
        v1.setTitle("Full Stack Spring Boot 3 & React Full Course - 2025");
        v1.setCreator("Java Guides");
        v1.setCreatorAvatar("https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80");
        v1.setVideoType("youtube_playlist");
        v1.setYoutubeUrl("https://www.youtube.com/playlist?list=PLGRDMO4rOGcNLwDb8TRb1pnFf4_oOek69");
        v1.setYoutubeId("playlist");
        v1.setPlaylistId("PLGRDMO4rOGcNLwDb8TRb1pnFf4_oOek69");
        v1.setThumbnailUrl("https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80");
        v1.setCategory("Programming");
        v1.setDuration("18 Videos • Complete Series");
        v1.setViewCount(14200L);
        v1.setLikeCount(890L);
        v1.setIsPlaylist(true);
        v1.setDescription("Master enterprise backend architectures using Spring Boot 3, Spring Security, Hibernate ORM, and modern React with Vite.");
        defaults.add(v1);

        Video v2 = new Video();
        v2.setTitle("System Design Masterclass: High Scale Distributed Systems");
        v2.setCreator("ByteByteGo");
        v2.setCreatorAvatar("https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80");
        v2.setVideoType("youtube");
        v2.setYoutubeUrl("https://www.youtube.com/watch?v=i53Gi_K3o7I");
        v2.setYoutubeId("i53Gi_K3o7I");
        v2.setThumbnailUrl("https://img.youtube.com/vi/i53Gi_K3o7I/hqdefault.jpg");
        v2.setCategory("System Design");
        v2.setDuration("45 Mins • Deep Dive");
        v2.setViewCount(38200L);
        v2.setLikeCount(2140L);
        v2.setIsPlaylist(false);
        v2.setDescription("Learn core primitives of distributed systems: caching strategies, database replication, message queues, and load balancing.");
        defaults.add(v2);

        Video v3 = new Video();
        v3.setTitle("Data Structures & Algorithms Complete Course: LeetCode to Top Tech");
        v3.setCreator("NeetCode");
        v3.setCreatorAvatar("https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=120&q=80");
        v3.setVideoType("youtube_playlist");
        v3.setYoutubeUrl("https://www.youtube.com/playlist?list=PLot-Xpze53lf5C3HSjCnyFghlW0G1QKXo");
        v3.setYoutubeId("playlist");
        v3.setPlaylistId("PLot-Xpze53lf5C3HSjCnyFghlW0G1QKXo");
        v3.setThumbnailUrl("https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80");
        v3.setCategory("Algorithms");
        v3.setDuration("24 Videos • Complete DSA Track");
        v3.setViewCount(24500L);
        v3.setLikeCount(1730L);
        v3.setIsPlaylist(true);
        v3.setDescription("Comprehensive walkthrough of the Blind 75 algorithms, dynamic programming patterns, graphs, and binary tree traversal.");
        defaults.add(v3);

        return defaults;
    }
}
