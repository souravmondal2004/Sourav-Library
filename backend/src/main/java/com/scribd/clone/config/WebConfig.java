package com.scribd.clone.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*", "https://*.vercel.app", "https://sourav-library.vercel.app", "https://*.onrender.com", "https://sourav-library.onrender.com")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD")
                .allowedHeaders("*")
                .exposedHeaders("Content-Disposition", "Content-Range", "Accept-Ranges", "Content-Length", "ETag", "Authorization")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
