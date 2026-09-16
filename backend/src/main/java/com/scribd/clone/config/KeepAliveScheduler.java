package com.scribd.clone.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;

/**
 * Self-ping keep-alive scheduler for Render free tier.
 * 
 * Render free-tier containers sleep after ~15 minutes of inactivity.
 * This scheduler pings the server's own external health endpoint every 10 minutes,
 * which counts as incoming traffic and prevents Render from sleeping the container.
 * 
 * Only activates when RENDER_EXTERNAL_URL environment variable is set (auto-provided by Render).
 */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "RENDER_EXTERNAL_URL")
public class KeepAliveScheduler {

    private static final Logger log = LoggerFactory.getLogger(KeepAliveScheduler.class);

    @Value("${RENDER_EXTERNAL_URL:}")
    private String renderExternalUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    private int pingCount = 0;

    /**
     * Pings the server's own health endpoint every 10 minutes (600,000 ms).
     * Initial delay of 2 minutes (120,000 ms) to let the server fully start up.
     */
    @Scheduled(fixedRate = 600_000, initialDelay = 120_000)
    public void keepAlive() {
        if (renderExternalUrl == null || renderExternalUrl.isBlank()) {
            return;
        }

        pingCount++;
        String healthUrl = renderExternalUrl + "/api/health";

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(healthUrl))
                    .GET()
                    .timeout(Duration.ofSeconds(10))
                    .header("User-Agent", "SouravLibrary-KeepAlive/1.0")
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            log.info("[Keep-Alive #{} @ {}] Pinged {} → HTTP {} (server stays awake)",
                    pingCount, Instant.now(), healthUrl, response.statusCode());
        } catch (Exception e) {
            log.warn("[Keep-Alive #{} @ {}] Ping failed for {}: {}",
                    pingCount, Instant.now(), healthUrl, e.getMessage());
        }
    }
}
