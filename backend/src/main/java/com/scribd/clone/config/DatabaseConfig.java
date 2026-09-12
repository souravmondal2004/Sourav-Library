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

@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Value("${SPRING_DATASOURCE_URL:${DATABASE_URL:}}")
    private String databaseUrl;

    @Value("${spring.datasource.username:}")
    private String defaultUsername;

    @Value("${spring.datasource.password:}")
    private String defaultPassword;

    @Value("${spring.datasource.driver-class-name:}")
    private String defaultDriver;

    @Bean
    @Primary
    public DataSource dataSource() {
        if (databaseUrl != null && !databaseUrl.isBlank()) {
            String url = databaseUrl.trim();

            // 1. Render / Heroku / Supabase / Neon standard URI: postgres:// or postgresql://
            if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
                try {
                    log.info("Detected cloud PostgreSQL URI from environment. Configuring HikariCP...");
                    URI uri = new URI(url.replace("postgresql://", "http://").replace("postgres://", "http://"));
                    String host = uri.getHost();
                    int port = uri.getPort() > 0 ? uri.getPort() : 5432;
                    String path = uri.getPath();
                    String userInfo = uri.getUserInfo();

                    String username = defaultUsername;
                    String password = defaultPassword;
                    if (userInfo != null && userInfo.contains(":")) {
                        String[] parts = userInfo.split(":", 2);
                        username = parts[0];
                        password = parts[1];
                    }

                    String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path;
                    if (uri.getQuery() != null) {
                        jdbcUrl += "?" + uri.getQuery();
                    }

                    HikariConfig config = new HikariConfig();
                    config.setJdbcUrl(jdbcUrl);
                    config.setUsername(username);
                    config.setPassword(password);
                    config.setDriverClassName("org.postgresql.Driver");
                    config.setMaximumPoolSize(10);
                    config.setMinimumIdle(2);
                    config.setConnectionTimeout(30000);
                    config.setIdleTimeout(600000);
                    log.info("Successfully initialized Cloud PostgreSQL DataSource for: {}", host);
                    return new HikariDataSource(config);
                } catch (Exception e) {
                    log.warn("Could not parse cloud PostgreSQL URI, falling back to standard JDBC config: {}", e.getMessage());
                }
            } else if (url.startsWith("jdbc:postgresql://")) {
                log.info("Detected JDBC PostgreSQL URL. Initializing PostgreSQL DataSource...");
                HikariConfig config = new HikariConfig();
                config.setJdbcUrl(url);
                if (defaultUsername != null && !defaultUsername.isBlank()) config.setUsername(defaultUsername);
                if (defaultPassword != null && !defaultPassword.isBlank()) config.setPassword(defaultPassword);
                config.setDriverClassName("org.postgresql.Driver");
                return new HikariDataSource(config);
            } else if (url.startsWith("jdbc:oracle:")) {
                log.info("Detected Oracle JDBC URL. Initializing Oracle DataSource...");
                HikariConfig config = new HikariConfig();
                config.setJdbcUrl(url);
                if (defaultUsername != null && !defaultUsername.isBlank()) config.setUsername(defaultUsername);
                if (defaultPassword != null && !defaultPassword.isBlank()) config.setPassword(defaultPassword);
                config.setDriverClassName("oracle.jdbc.OracleDriver");
                return new HikariDataSource(config);
            }
        }

        // 2. Default Local Fallback (H2 file-based persistent database)
        log.info("Using local persistent H2 database storage.");
        HikariConfig config = new HikariConfig();
        String localUrl = (databaseUrl != null && !databaseUrl.isBlank())
                ? databaseUrl
                : "jdbc:h2:file:./data/scribddb;MODE=Oracle;AUTO_SERVER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1";
        config.setJdbcUrl(localUrl);
        config.setUsername(defaultUsername != null && !defaultUsername.isBlank() ? defaultUsername : "sa");
        config.setPassword(defaultPassword != null && !defaultPassword.isBlank() ? defaultPassword : "");
        config.setDriverClassName(defaultDriver != null && !defaultDriver.isBlank() ? defaultDriver : "org.h2.Driver");
        return new HikariDataSource(config);
    }
}
