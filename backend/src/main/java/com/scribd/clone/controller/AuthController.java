package com.scribd.clone.controller;

import com.scribd.clone.dto.AuthRequest;
import com.scribd.clone.dto.AuthResponse;
import com.scribd.clone.dto.RegisterRequest;
import com.scribd.clone.model.User;
import com.scribd.clone.repository.UserRepository;
import com.scribd.clone.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final com.scribd.clone.repository.BookmarkRepository bookmarkRepository;
    private final com.scribd.clone.repository.ReadingHistoryRepository readingHistoryRepository;

    public AuthController(
            AuthService authService,
            UserRepository userRepository,
            com.scribd.clone.repository.BookmarkRepository bookmarkRepository,
            com.scribd.clone.repository.ReadingHistoryRepository readingHistoryRepository
    ) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.readingHistoryRepository = readingHistoryRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            return ResponseEntity.status(401).body(Map.of("message", "Not authenticated"));
        }

        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail(),
                "role", user.getRole(),
                "fullName", user.getFullName() != null ? user.getFullName() : user.getUsername()
        ));
    }

    @GetMapping("/registered-users")
    public ResponseEntity<?> getRegisteredUsers() {
        var users = userRepository.findAll().stream().map(u -> Map.of(
                "id", u.getId(),
                "username", u.getUsername(),
                "email", u.getEmail() != null ? u.getEmail() : "",
                "fullName", u.getFullName() != null ? u.getFullName() : u.getUsername(),
                "role", u.getRole() != null ? u.getRole() : "ROLE_USER",
                "createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : java.time.Instant.now().toString(),
                "booksReadCount", 0
        )).toList();
        return ResponseEntity.ok(users);
    }

    @org.springframework.transaction.annotation.Transactional
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (id == 1L) {
            return ResponseEntity.badRequest().body(Map.of("message", "Master Admin account cannot be deleted"));
        }
        var bookmarks = bookmarkRepository.findByUserIdOrderByCreatedAtDesc(id);
        if (bookmarks != null && !bookmarks.isEmpty()) {
            bookmarkRepository.deleteAll(bookmarks);
        }
        var history = readingHistoryRepository.findByUserIdOrderByLastReadAtDesc(id);
        if (history != null && !history.isEmpty()) {
            readingHistoryRepository.deleteAll(history);
        }
        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "User account deleted successfully", "id", id));
    }
}
