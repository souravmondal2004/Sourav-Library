package com.scribd.clone.controller;

import com.scribd.clone.config.DatabaseConfig;
import com.scribd.clone.repository.DocumentRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class HealthController {

    private final DocumentRepository documentRepository;

    public HealthController(DocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
    }

    @GetMapping(value = {"/", "/api/health"})
    public ResponseEntity<?> healthCheck(@RequestHeader(value = HttpHeaders.ACCEPT, defaultValue = "") String acceptHeader) {
        long docCount = 0;
        try {
            docCount = documentRepository.count();
        } catch (Exception ignored) {}

        String dbType = DatabaseConfig.getActiveDatabaseType();
        boolean persistent = DatabaseConfig.isDatabasePersistent();
        String detectedEnv = DatabaseConfig.getDetectedEnvKey();
        String targetHost = DatabaseConfig.getTargetDatabaseHost();
        String connStatus = DatabaseConfig.getConnectionStatus();
        String lastError = DatabaseConfig.getLastError();

        // If client is a web browser requesting HTML, present a beautiful status dashboard
        if (acceptHeader.contains(MediaType.TEXT_HTML_VALUE)) {
            String statusColor = persistent ? "#10b981" : "#fbbf24";
            String statusText = persistent ? "Persistent (Active)" : "Ephemeral Fallback";

            String diagBanner = "";
            if (!persistent) {
                diagBanner = """
                    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem; text-align: left; font-size: 0.85rem;">
                        <div style="color: #fbbf24; font-weight: 700; margin-bottom: 0.3rem;">⚠️ Cloud Database Warning: Running on Local Ephemeral Storage</div>
                        <div style="color: #cbd5e1; line-height: 1.4;">
                            <strong>Environment Key:</strong> {ENV_KEY}<br>
                            <strong>Status:</strong> {CONN_STATUS}<br>
                            {ERROR_DETAILS}
                            <span style="color: #94a3b8; display: block; margin-top: 0.4rem;">To make data 100% permanent, add your PostgreSQL connection string as <code>DATABASE_URL</code> in Render Environment variables.</span>
                        </div>
                    </div>
                    """
                    .replace("{ENV_KEY}", detectedEnv != null ? detectedEnv : "None")
                    .replace("{CONN_STATUS}", connStatus != null ? connStatus : "No config")
                    .replace("{ERROR_DETAILS}", lastError != null ? "<strong>Error:</strong> <span style='color: #f87171;'>" + lastError + "</span><br>" : "");
            }

            String html = """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Sourav's Library • Cloud API Status</title>
                    <link rel="icon" type="image/svg+xml" href="https://sourav-library.vercel.app/SteveLambert-Library-Book-Cart.svg" />
                    <style>
                        :root {
                            --bg: #090d16;
                            --card-bg: rgba(16, 24, 40, 0.85);
                            --border: rgba(255, 255, 255, 0.08);
                            --emerald: #10b981;
                            --emerald-glow: rgba(16, 185, 129, 0.25);
                            --text: #f1f5f9;
                            --muted: #94a3b8;
                            --accent: #38bdf8;
                        }
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            background: radial-gradient(circle at 50% 20%, #132238 0%, var(--bg) 75%);
                            color: var(--text);
                            min-height: 100vh;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            padding: 1.5rem;
                        }
                        .container {
                            width: 100%;
                            max-width: 580px;
                            background: var(--card-bg);
                            backdrop-filter: blur(16px);
                            border: 1px solid var(--border);
                            border-radius: 20px;
                            padding: 2.5rem;
                            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px var(--emerald-glow);
                            text-align: center;
                        }
                        .pulse-wrapper {
                            display: inline-flex;
                            align-items: center;
                            gap: 0.5rem;
                            background: rgba(16, 185, 129, 0.12);
                            border: 1px solid rgba(16, 185, 129, 0.3);
                            padding: 0.35rem 0.9rem;
                            border-radius: 9999px;
                            font-size: 0.82rem;
                            font-weight: 600;
                            color: var(--emerald);
                            margin-bottom: 1.5rem;
                        }
                        .pulse-dot {
                            width: 8px;
                            height: 8px;
                            background: var(--emerald);
                            border-radius: 50%;
                            box-shadow: 0 0 10px var(--emerald);
                            animation: pulse 2s infinite;
                        }
                        @keyframes pulse {
                            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
                            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                        }
                        h1 { font-size: 1.85rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
                        p.subtitle { color: var(--muted); font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.5; }
                        .metrics-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 1rem;
                            margin-bottom: 2rem;
                            text-align: left;
                        }
                        .metric-card {
                            background: rgba(255, 255, 255, 0.03);
                            border: 1px solid var(--border);
                            border-radius: 12px;
                            padding: 1rem 1.25rem;
                        }
                        .metric-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); font-weight: 600; margin-bottom: 0.35rem; }
                        .metric-value { font-size: 1.05rem; font-weight: 700; color: var(--text); }
                        .actions { display: flex; flex-direction: column; gap: 0.75rem; }
                        .btn {
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            gap: 0.5rem;
                            padding: 0.85rem 1.5rem;
                            border-radius: 10px;
                            font-weight: 600;
                            font-size: 0.95rem;
                            text-decoration: none;
                            transition: all 0.2s ease;
                            cursor: pointer;
                        }
                        .btn-primary {
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                            color: #ffffff;
                            border: none;
                            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
                        }
                        .btn-primary:hover {
                            background: linear-gradient(135deg, #059669 0%, #047857 100%);
                            transform: translateY(-1px);
                        }
                        .btn-secondary {
                            background: rgba(255, 255, 255, 0.05);
                            color: var(--muted);
                            border: 1px solid var(--border);
                        }
                        .btn-secondary:hover {
                            background: rgba(255, 255, 255, 0.09);
                            color: var(--text);
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="pulse-wrapper">
                            <span class="pulse-dot"></span>
                            Backend API System Live
                        </div>
                        <h1>Sourav's Library Cloud Service</h1>
                        <p class="subtitle">High-performance Spring Boot document delivery service & high-fidelity byte-range streaming engine.</p>
                        
                        {DIAG_BANNER}

                        <div class="metrics-grid">
                            <div class="metric-card">
                                <div class="metric-label">Cloud Database</div>
                                <div class="metric-value" style="color: #38bdf8;">{DB_TYPE}</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-label">Database Persistence</div>
                                <div class="metric-value" style="color: {STATUS_COLOR};">{STATUS_TEXT}</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-label">Active Publications</div>
                                <div class="metric-value">{DOC_COUNT} Books</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-label">Streaming Protocol</div>
                                <div class="metric-value">HTTP 206 Partial Content</div>
                            </div>
                        </div>

                        <div class="actions">
                            <a href="https://sourav-library.vercel.app" class="btn btn-primary">
                                Open Sourav's Library Web App &rarr;
                            </a>
                            <a href="/api/documents" class="btn btn-secondary">
                                View Public Catalog API (JSON)
                            </a>
                        </div>
                    </div>
                </body>
                </html>
                """
                .replace("{DIAG_BANNER}", diagBanner)
                .replace("{DB_TYPE}", dbType != null ? dbType : "PostgreSQL (Cloud Persistent)")
                .replace("{STATUS_COLOR}", statusColor)
                .replace("{STATUS_TEXT}", statusText)
                .replace("{DOC_COUNT}", String.valueOf(docCount));
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(html);
        }

        // Standard JSON health check payload for Render monitoring and curl
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "UP");
        response.put("service", "sourav-library");
        response.put("timestamp", Instant.now().toString());
        response.put("database", dbType);
        response.put("isPersistent", persistent);

        Map<String, Object> diagnostics = new LinkedHashMap<>();
        diagnostics.put("detectedEnvironmentVariable", detectedEnv);
        diagnostics.put("targetHost", targetHost);
        diagnostics.put("connectionStatus", connStatus);
        diagnostics.put("lastError", lastError);
        response.put("databaseDiagnostics", diagnostics);

        response.put("documentsCount", docCount);
        response.put("webAppUrl", "https://sourav-library.vercel.app");

        return ResponseEntity.ok(response);
    }
}
