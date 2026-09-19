package com.scribd.clone.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    private static String activeDatabaseType = "H2 (Local Ephemeral Container)";
    private static boolean databasePersistent = false;
    private static String detectedEnvKey = "None";
    private static String targetDatabaseHost = "None";
    private static String connectionStatus = "Initializing";
    private static String lastConnectionError = null;

    @Value("${SPRING_DATASOURCE_URL:${DATABASE_URL:${POSTGRES_URL:${POSTGRESQL_URL:}}}}")
    private String databaseUrlProperty;

    @Value("${spring.datasource.username:}")
    private String defaultUsername;

    @Value("${spring.datasource.password:}")
    private String defaultPassword;

    @Value("${spring.datasource.driver-class-name:}")
    private String defaultDriver;

    public static String getActiveDatabaseType() {
        return activeDatabaseType;
    }

    public static boolean isDatabasePersistent() {
        return databasePersistent;
    }

    public static String getDetectedEnvKey() {
        return detectedEnvKey;
    }

    public static String getTargetDatabaseHost() {
        return targetDatabaseHost;
    }

    public static String getConnectionStatus() {
        return connectionStatus;
    }

    public static String getLastConnectionError() {
        return lastConnectionError;
    }

    public static String getLastError() {
        return lastConnectionError;
    }

    @Bean
    @Primary
    public DataSource dataSource() {
        // 1. Check all standard cloud environment variables in order
        String url = resolveDatabaseUrl();

        if (url != null && !url.isBlank()) {
            url = url.trim();

            // Cloud PostgreSQL URI (postgres:// or postgresql://)
            if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
                DataSource ds = configurePostgresUri(url);
                if (ds != null) {
                    activeDatabaseType = "PostgreSQL (Cloud Persistent)";
                    databasePersistent = true;
                    connectionStatus = "Active & Connected (" + targetDatabaseHost + ")";
                    log.info("Active Database: PostgreSQL (Cloud Persistent) on {}", targetDatabaseHost);
                    return ds;
                }
            } else if (url.startsWith("jdbc:postgresql://")) {
                DataSource ds = configurePostgresJdbc(url);
                if (ds != null) {
                    activeDatabaseType = "PostgreSQL (Cloud Persistent)";
                    databasePersistent = true;
                    connectionStatus = "Active & Connected (JDBC PostgreSQL)";
                    log.info("Active Database: PostgreSQL (Cloud Persistent)");
                    return ds;
                }
            } else if (url.startsWith("jdbc:oracle:")) {
                DataSource ds = configureOracleJdbc(url);
                if (ds != null) {
                    activeDatabaseType = "Oracle (Cloud / Enterprise)";
                    databasePersistent = true;
                    connectionStatus = "Active & Connected (Oracle)";
                    log.info("Active Database: Oracle (Enterprise)");
                    return ds;
                }
            }
        }

        // 2. Default Local Fallback (H2 file-based persistent database)
        activeDatabaseType = "H2 (Local Container Ephemeral)";
        databasePersistent = false;
        if (lastConnectionError == null) {
            connectionStatus = "Using H2 (No cloud database configured in environment)";
        } else {
            connectionStatus = "Using H2 Fallback (Cloud DB connection failed: " + lastConnectionError + ")";
        }

        log.warn("==========================================================================");
        log.warn("⚠️ Cloud Database is NOT active. Status: {}", connectionStatus);
        log.warn("Falling back to local H2 storage: ./data/scribddb");
        log.warn("NOTE: On Render free tier, local container files reset when the server sleeps!");
        log.warn("To make data 100% permanent, ensure DATABASE_URL is set and reachable in Render.");
        log.warn("==========================================================================");

        HikariConfig config = new HikariConfig();
        String localUrl = (url != null && !url.isBlank() && url.startsWith("jdbc:h2:"))
                ? url
                : "jdbc:h2:file:./data/scribddb;MODE=Oracle;AUTO_SERVER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1";
        config.setJdbcUrl(localUrl);
        config.setUsername(defaultUsername != null && !defaultUsername.isBlank() ? defaultUsername : "sa");
        config.setPassword(defaultPassword != null && !defaultPassword.isBlank() ? defaultPassword : "");
        config.setDriverClassName(defaultDriver != null && !defaultDriver.isBlank() ? defaultDriver : "org.h2.Driver");
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        return new HikariDataSource(config);
    }

    private String resolveDatabaseUrl() {
        // Direct System environment variable check (takes precedence in cloud Docker/Render)
        String[] envKeys = {"DATABASE_URL", "SPRING_DATASOURCE_URL", "POSTGRES_URL", "POSTGRESQL_URL", "JDBC_DATABASE_URL", "NEON_DATABASE_URL"};
        for (String key : envKeys) {
            String val = System.getenv(key);
            if (val != null && !val.isBlank()) {
                detectedEnvKey = key;
                log.info("Discovered database URL from environment variable: {}", key);
                return val.trim();
            }
        }
        if (databaseUrlProperty != null && !databaseUrlProperty.isBlank()) {
            detectedEnvKey = "Spring Property (spring.datasource.url)";
            return databaseUrlProperty.trim();
        }
        detectedEnvKey = "None (DATABASE_URL / SPRING_DATASOURCE_URL is unset)";
        return null;
    }

    private DataSource configurePostgresUri(String rawUrl) {
        try {
            log.info("Parsing cloud PostgreSQL connection URI...");
            String cleanUrl = rawUrl.trim();

            // Handle postgres:// or postgresql:// prefix
            String noPrefix = cleanUrl.replaceFirst("^postgres(ql)?://", "");

            String userInfo = null;
            String hostPortDb = noPrefix;

            // Separate user:pass from host:port/db using lastIndexOf to preserve passwords with '@'
            int atIndex = noPrefix.lastIndexOf('@');
            if (atIndex > 0) {
                userInfo = noPrefix.substring(0, atIndex);
                hostPortDb = noPrefix.substring(atIndex + 1);
            }

            String username = defaultUsername;
            String password = defaultPassword;
            if (userInfo != null && userInfo.contains(":")) {
                int colonIdx = userInfo.indexOf(':');
                username = URLDecoder.decode(userInfo.substring(0, colonIdx), StandardCharsets.UTF_8);
                password = URLDecoder.decode(userInfo.substring(colonIdx + 1), StandardCharsets.UTF_8);
            } else if (userInfo != null) {
                username = URLDecoder.decode(userInfo, StandardCharsets.UTF_8);
            }

            // Extract host, port, database, and query params
            String hostPort = hostPortDb;
            String dbAndParams = "";
            int slashIdx = hostPortDb.indexOf('/');
            if (slashIdx >= 0) {
                hostPort = hostPortDb.substring(0, slashIdx);
                dbAndParams = hostPortDb.substring(slashIdx);
            }

            String host = hostPort;
            int port = 5432;
            if (hostPort.contains(":")) {
                String[] parts = hostPort.split(":", 2);
                host = parts[0];
                try {
                    port = Integer.parseInt(parts[1]);
                } catch (NumberFormatException ignored) {}
            }
            targetDatabaseHost = host + ":" + port;

            // Ensure SSL is enabled for cloud PostgreSQL instances
            String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + dbAndParams;
            if (!jdbcUrl.contains("sslmode=")) {
                jdbcUrl += (jdbcUrl.contains("?") ? "&" : "?") + "sslmode=require";
            }

            HikariConfig config = new HikariConfig();
            config.setJdbcUrl(jdbcUrl);
            if (username != null && !username.isBlank()) config.setUsername(username);
            if (password != null && !password.isBlank()) config.setPassword(password);
            config.setDriverClassName("org.postgresql.Driver");
            config.setMaximumPoolSize(10);
            config.setMinimumIdle(1);
            config.setConnectionTimeout(30000);
            config.setInitializationFailTimeout(30000);
            config.setIdleTimeout(300000);
            config.setMaxLifetime(1800000);
            config.setLeakDetectionThreshold(15000);

            log.info("Attempting connection to Cloud PostgreSQL at {}...", targetDatabaseHost);
            HikariDataSource ds = new HikariDataSource(config);

            // Verify the connection actually succeeds
            try (java.sql.Connection conn = ds.getConnection()) {
                log.info("Successfully connected to Cloud PostgreSQL at {}!", targetDatabaseHost);
            }

            lastConnectionError = null;
            return ds;
        } catch (Exception e) {
            String msg = (e.getMessage() != null && !e.getMessage().isBlank()) ? e.getMessage() : e.getClass().getSimpleName();
            lastConnectionError = msg;
            log.error("Failed to connect to Cloud PostgreSQL: {}", msg, e);
            return null;
        }
    }

    private DataSource configurePostgresJdbc(String url) {
        try {
            String jdbcUrl = url.trim();
            if (!jdbcUrl.contains("sslmode=") && !jdbcUrl.contains("localhost") && !jdbcUrl.contains("127.0.0.1")) {
                jdbcUrl += (jdbcUrl.contains("?") ? "&" : "?") + "sslmode=require";
            }

            HikariConfig config = new HikariConfig();
            config.setJdbcUrl(jdbcUrl);
            if (defaultUsername != null && !defaultUsername.isBlank()) config.setUsername(defaultUsername);
            if (defaultPassword != null && !defaultPassword.isBlank()) config.setPassword(defaultPassword);
            config.setDriverClassName("org.postgresql.Driver");
            config.setMaximumPoolSize(10);
            config.setMinimumIdle(1);
            config.setConnectionTimeout(30000);
            config.setInitializationFailTimeout(30000);
            config.setLeakDetectionThreshold(15000);

            HikariDataSource ds = new HikariDataSource(config);
            try (java.sql.Connection conn = ds.getConnection()) {
                log.info("Successfully connected to Cloud PostgreSQL via JDBC URL!");
            }

            lastConnectionError = null;
            return ds;
        } catch (Exception e) {
            String msg = (e.getMessage() != null && !e.getMessage().isBlank()) ? e.getMessage() : e.getClass().getSimpleName();
            lastConnectionError = msg;
            log.error("Failed to configure JDBC PostgreSQL DataSource: {}", msg, e);
            return null;
        }
    }

    private DataSource configureOracleJdbc(String url) {
        try {
            HikariConfig config = new HikariConfig();
            config.setJdbcUrl(url);
            if (defaultUsername != null && !defaultUsername.isBlank()) config.setUsername(defaultUsername);
            if (defaultPassword != null && !defaultPassword.isBlank()) config.setPassword(defaultPassword);
            config.setDriverClassName("oracle.jdbc.OracleDriver");
            config.setMaximumPoolSize(10);
            config.setMinimumIdle(2);
            return new HikariDataSource(config);
        } catch (Exception e) {
            log.error("Failed to configure Oracle DataSource: {}", e.getMessage());
            return null;
        }
    }
}
