package com.scribd.clone.controller;

import com.scribd.clone.dto.DocumentResponseDto;
import com.scribd.clone.dto.ReadingProgressDto;
import com.scribd.clone.service.UserLibraryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user/library")
public class UserLibraryController {

    private final UserLibraryService userLibraryService;

    public UserLibraryController(UserLibraryService userLibraryService) {
        this.userLibraryService = userLibraryService;
    }

    @GetMapping("/history")
    public ResponseEntity<List<DocumentResponseDto>> getHistory(Authentication authentication) {
        return ResponseEntity.ok(userLibraryService.getUserReadingHistory(authentication.getName()));
    }

    @GetMapping("/bookmarks")
    public ResponseEntity<List<DocumentResponseDto>> getBookmarks(Authentication authentication) {
        return ResponseEntity.ok(userLibraryService.getUserBookmarks(authentication.getName()));
    }

    @PostMapping("/progress/{documentId}")
    public ResponseEntity<?> updateProgress(
            @PathVariable Long documentId,
            @RequestBody ReadingProgressDto dto,
            Authentication authentication
    ) {
        userLibraryService.updateReadingProgress(authentication.getName(), documentId, dto);
        return ResponseEntity.ok(Map.of("message", "Progress updated"));
    }

    @PostMapping("/bookmark/{documentId}")
    public ResponseEntity<?> toggleBookmark(
            @PathVariable Long documentId,
            Authentication authentication
    ) {
        boolean bookmarked = userLibraryService.toggleBookmark(authentication.getName(), documentId);
        return ResponseEntity.ok(Map.of(
                "bookmarked", bookmarked,
                "message", bookmarked ? "Document bookmarked" : "Bookmark removed"
        ));
    }

    @GetMapping("/bookmark/{documentId}/status")
    public ResponseEntity<?> getBookmarkStatus(
            @PathVariable Long documentId,
            Authentication authentication
    ) {
        boolean bookmarked = userLibraryService.isBookmarked(authentication.getName(), documentId);
        return ResponseEntity.ok(Map.of("bookmarked", bookmarked));
    }
}
