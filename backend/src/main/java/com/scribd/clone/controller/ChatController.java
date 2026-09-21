package com.scribd.clone.controller;

import com.scribd.clone.model.Document;
import com.scribd.clone.repository.DocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private final DocumentRepository documentRepository;
    private final RestTemplate restTemplate;

    public ChatController(DocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
        this.restTemplate = new RestTemplate();
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chatWithSouravAI(@RequestBody Map<String, Object> request) {
        String prompt = request.getOrDefault("prompt", "").toString();
        if (prompt == null || prompt.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Prompt cannot be empty"));
        }

        String model = request.getOrDefault("model", "gemini-2.0-flash").toString();

        // 1. If server has a GEMINI_API_KEY configured, call Google Gemini API
        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            try {
                String reply = callGoogleGemini(prompt);
                if (reply != null && !reply.isBlank()) {
                    return ResponseEntity.ok(Map.of(
                            "reply", reply,
                            "model", "Google Gemini API (Server Key)"
                    ));
                }
            } catch (Exception e) {
                log.warn("Server Gemini API call failed: {}", e.getMessage());
            }
        }

        // 2. Call Cloud LLM Engine (Free, high-speed, CORS enabled)
        try {
            String systemContext = buildSystemContext();
            String reply = callCloudAi(prompt, systemContext);
            if (reply != null && !reply.isBlank()) {
                return ResponseEntity.ok(Map.of(
                        "reply", reply,
                        "model", "Sourav AI (Cloud LLM Engine)"
                ));
            }
        } catch (Exception e) {
            log.warn("Cloud LLM call failed: {}", e.getMessage());
        }

        // 3. Fallback intelligent response
        String fallback = "### 💡 Sourav AI Insight\n\n"
                + "Thank you for asking: **\"" + prompt + "\"**\n\n"
                + "I can help answer any questions regarding full-stack software development (Spring Boot, React, Vite, Java, SQL, Cloud deployment), data structures, and computer science concepts, as well as guide you through books and videos on Sourav's Library.\n\n"
                + "> *Tip: You can add your free Google Gemini API Key in the frontend AI Settings for direct Gemini 2.0 access!*";

        return ResponseEntity.ok(Map.of(
                "reply", fallback,
                "model", "Sourav AI (Fallback Mode)"
        ));
    }

    private String buildSystemContext() {
        try {
            List<Document> topDocs = documentRepository.findTop10ByIsPublishedTrueOrderByViewCountDesc();
            String docTitles = topDocs.stream()
                    .map(d -> "\"" + d.getTitle() + "\" by " + d.getAuthor())
                    .collect(Collectors.joining(", "));

            return "You are Sourav AI, a brilliant AI assistant inspired by Google Gemini, embedded into Sourav's Library & Multimedia Hub. "
                    + "Answer any user question with deep clarity, accurate facts, clean code snippets (with markdown syntax), and helpful formatting. "
                    + (docTitles.isEmpty() ? "" : "The platform contains books including: " + docTitles + ".");
        } catch (Exception e) {
            return "You are Sourav AI, a brilliant AI assistant inspired by Google Gemini. Answer any question thoroughly.";
        }
    }

    private String callGoogleGemini(String userPrompt) {
        String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> textPart = Map.of("text", userPrompt);
        Map<String, Object> content = Map.of("parts", List.of(textPart));
        Map<String, Object> body = Map.of("contents", List.of(content));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.exchange(endpoint, HttpMethod.POST, entity, Map.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            List candidates = (List) response.getBody().get("candidates");
            if (candidates != null && !candidates.isEmpty()) {
                Map firstCandidate = (Map) candidates.get(0);
                Map contentObj = (Map) firstCandidate.get("content");
                if (contentObj != null) {
                    List parts = (List) contentObj.get("parts");
                    if (parts != null && !parts.isEmpty()) {
                        Map firstPart = (Map) parts.get(0);
                        return (String) firstPart.get("text");
                    }
                }
            }
        }
        return null;
    }

    private String callCloudAi(String userPrompt, String systemContext) {
        String endpoint = "https://text.pollinations.ai/";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        List<Map<String, String>> messages = List.of(
                Map.of("role", "system", "content", systemContext),
                Map.of("role", "user", "content", userPrompt)
        );

        Map<String, Object> body = Map.of(
                "messages", messages,
                "model", "openai"
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.exchange(endpoint, HttpMethod.POST, entity, String.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            String text = response.getBody().trim();
            if (!text.startsWith("<!DOCTYPE html>")) {
                return text;
            }
        }
        return null;
    }
}
