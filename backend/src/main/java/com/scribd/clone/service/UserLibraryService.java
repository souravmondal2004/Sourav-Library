package com.scribd.clone.service;

import com.scribd.clone.dto.DocumentResponseDto;
import com.scribd.clone.dto.ReadingProgressDto;
import com.scribd.clone.model.Bookmark;
import com.scribd.clone.model.Document;
import com.scribd.clone.model.ReadingHistory;
import com.scribd.clone.model.User;
import com.scribd.clone.repository.BookmarkRepository;
import com.scribd.clone.repository.DocumentRepository;
import com.scribd.clone.repository.ReadingHistoryRepository;
import com.scribd.clone.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserLibraryService {

    private final ReadingHistoryRepository readingHistoryRepository;
    private final BookmarkRepository bookmarkRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;

    public UserLibraryService(
            ReadingHistoryRepository readingHistoryRepository,
            BookmarkRepository bookmarkRepository,
            DocumentRepository documentRepository,
            UserRepository userRepository
    ) {
        this.readingHistoryRepository = readingHistoryRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
    }

    public List<DocumentResponseDto> getUserReadingHistory(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        return readingHistoryRepository.findByUserIdOrderByLastReadAtDesc(user.getId())
                .stream()
                .map(rh -> DocumentResponseDto.fromEntity(rh.getDocument()))
                .collect(Collectors.toList());
    }

    public List<DocumentResponseDto> getUserBookmarks(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        return bookmarkRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(bm -> DocumentResponseDto.fromEntity(bm.getDocument()))
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateReadingProgress(String username, Long documentId, ReadingProgressDto dto) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        ReadingHistory history = readingHistoryRepository.findByUserIdAndDocumentId(user.getId(), documentId)
                .orElse(new ReadingHistory(user, document, 1, 0.0));

        history.setLastPage(dto.getLastPage() != null ? dto.getLastPage() : 1);
        history.setProgressPercent(dto.getProgressPercent() != null ? dto.getProgressPercent() : 0.0);
        history.setLastReadAt(LocalDateTime.now());

        readingHistoryRepository.save(history);
    }

    @Transactional
    public boolean toggleBookmark(String username, Long documentId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        if (bookmarkRepository.existsByUserIdAndDocumentId(user.getId(), documentId)) {
            bookmarkRepository.deleteByUserIdAndDocumentId(user.getId(), documentId);
            return false;
        } else {
            Bookmark bookmark = new Bookmark(user, document, 1, null);
            bookmarkRepository.save(bookmark);
            return true;
        }
    }

    public boolean isBookmarked(String username, Long documentId) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return false;
        return bookmarkRepository.existsByUserIdAndDocumentId(user.getId(), documentId);
    }
}
