package com.scribd.clone.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class ChatController {

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chatWithSouravAI(@RequestBody Map<String, String> request) {
        String prompt = request.getOrDefault("prompt", "");
        if (prompt.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Prompt cannot be empty"));
        }

        String lower = prompt.toLowerCase();
        String reply;

        if (lower.contains("book") || lower.contains("library") || lower.contains("read")) {
            reply = "### 📚 Recommended Library Reading\n\n"
                    + "Our digital catalog contains high-demand engineering and system architecture books.\n\n"
                    + "1. **System Design & Distributed Systems**: Learn sharding, load balancers, and Redis caching.\n"
                    + "2. **Clean Architecture in Java & Spring**: Essential for scalable enterprise backends.\n\n"
                    + "You can open any of these titles in the **PDF & Books** section to start reading immediately!";
        } else if (lower.contains("video") || lower.contains("youtube") || lower.contains("playlist")) {
            reply = "### 🎬 Video Hub Learning Path\n\n"
                    + "Here is the recommended study sequence in our **Video Hub**:\n\n"
                    + "1. **Spring Boot 3 & Microservices Full Course** (2h 45m masterclass)\n"
                    + "2. **Modern React 19 Full-Stack Series** (18-part comprehensive YouTube playlist)\n"
                    + "3. **Designing YouTube & Video Streaming Services** (System Design Blueprint)\n\n"
                    + "Switch to the **Video Hub** tab above to start watching!";
        } else if (lower.contains("spring") && lower.contains("react")) {
            reply = "### ⚡ Spring Boot 3 + React Architecture\n\n"
                    + "In our application:\n"
                    + "- **React (Vite)** delivers sub-second client navigation and streaming readers.\n"
                    + "- **Spring Boot 3** exposes high-throughput REST APIs with JWT security.\n"
                    + "- **HTTP 206 Partial Content** handles byte-range video and PDF chunk streaming on-demand.\n\n"
                    + "```java\n"
                    + "@GetMapping(\"/api/stream/{id}\")\n"
                    + "public ResponseEntity<ResourceRegion> streamMedia(...) {\n"
                    + "    // Byte-range partial streaming\n"
                    + "}\n"
                    + "```";
        } else {
            reply = "### 💡 Sourav AI Insight\n\n"
                    + "Thank you for asking: **\"" + prompt + "\"**\n\n"
                    + "As your dedicated multi-media and coding tutor, I'm here to help you master full-stack software development, navigate our PDF book collections, and explore YouTube study playlists.\n\n"
                    + "How can I dive deeper into this topic for you?";
        }

        return ResponseEntity.ok(Map.of(
                "reply", reply,
                "model", "Sourav AI (Gemini Edition)"
        ));
    }
}
