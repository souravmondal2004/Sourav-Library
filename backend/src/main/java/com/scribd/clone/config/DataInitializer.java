package com.scribd.clone.config;

import com.scribd.clone.model.Category;
import com.scribd.clone.model.Document;
import com.scribd.clone.model.User;
import com.scribd.clone.repository.CategoryRepository;
import com.scribd.clone.repository.DocumentRepository;
import com.scribd.clone.repository.UserRepository;
import com.scribd.clone.service.FileStorageService;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final DocumentRepository documentRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;

    public DataInitializer(
            UserRepository userRepository,
            CategoryRepository categoryRepository,
            DocumentRepository documentRepository,
            PasswordEncoder passwordEncoder,
            FileStorageService fileStorageService
    ) {
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.documentRepository = documentRepository;
        this.passwordEncoder = passwordEncoder;
        this.fileStorageService = fileStorageService;
    }

    @Override
    public void run(String... args) throws Exception {
        User admin = initUsers();
        initCategories();
        initBundledAndSampleDocuments(admin);
    }

    private User initUsers() {
        User admin = userRepository.findByUsername("Sourav").orElse(null);

        if (admin == null) {
            admin = new User("Sourav", "sourav@lumina.local", passwordEncoder.encode("Sourav@2004"), "ROLE_ADMIN", "Sourav (Admin)");
            userRepository.save(admin);
            log.info("Initialized ADMIN account: Sourav / Sourav@2004");
        } else {
            log.info("ADMIN account Sourav already exists. Preserving existing credentials.");
        }

        if (!userRepository.existsByUsername("admin")) {
            User altAdmin = new User("admin", "admin@sourav-library.com", passwordEncoder.encode("admin123"), "ROLE_ADMIN", "Administrator");
            userRepository.save(altAdmin);
            log.info("Initialized default ADMIN account: admin / admin123");
        } else {
            log.info("ADMIN account admin already exists. Preserving existing credentials.");
        }

        if (!userRepository.existsByUsername("user")) {
            User defaultReader = new User("user", "user@sourav-library.com", passwordEncoder.encode("user123"), "ROLE_USER", "Standard Reader");
            userRepository.save(defaultReader);
            log.info("Initialized default READER account: user / user123");
        }

        return admin != null ? admin : userRepository.findByUsername("Sourav").orElse(null);
    }

    private void initCategories() {
        if (categoryRepository.count() == 0) {
            List<Category> categories = List.of(
                    new Category("Technology & Coding", "technology-coding", "Software architecture, AI, cloud engineering, and modern development.", "laptop"),
                    new Category("Business & Leadership", "business-leadership", "Entrepreneurship, strategy, organizational management, and innovation.", "briefcase"),
                    new Category("Science & Engineering", "science-engineering", "Quantum physics, biotechnology, space exploration, and materials science.", "atom"),
                    new Category("Literature & Fiction", "literature-fiction", "Classic tales, essays, thought pieces, and narrative prose.", "book-open"),
                    new Category("Personal Growth", "personal-growth", "Mental models, productivity, habits, and psychology.", "compass"),
                    new Category("Academic & Research", "academic-research", "Whitepapers, survey publications, and technical documentation.", "file-text")
            );
            categoryRepository.saveAll(categories);
            log.info("Initialized default categories");
        }
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private void initBundledAndSampleDocuments(User admin) {
        // 1. Scan and register any bundled PDF books from classpath:books/*.pdf
        scanAndRegisterBundledBooks(admin);

        // 2. Scan local-books folder if present on disk
        scanLocalBooksDirectory(admin);

        // 3. If catalog is still empty, seed default architectural guides
        if (documentRepository.count() == 0) {
            log.info("Catalog is empty. Generating default starter books...");
            Category tech = categoryRepository.findBySlug("technology-coding").orElse(null);
            Category business = categoryRepository.findBySlug("business-leadership").orElse(null);
            Category science = categoryRepository.findBySlug("science-engineering").orElse(null);

            if (tech != null) {
                createSampleBook(
                        "Building Enterprise Applications with Spring Boot & Oracle",
                        "Dr. Sarah Vance",
                        "A comprehensive guide to building resilient, cloud-native microservices backed by enterprise Oracle database clusters and modern web architectures.",
                        tech,
                        "spring-boot-oracle-guide.pdf",
                        4,
                        "English",
                        2025,
                        true,
                        admin,
                        "Spring Boot & Oracle Enterprise Guide"
                );
            }

            if (business != null) {
                createSampleBook(
                        "The Innovator's Architecture: Scaling High-Impact Teams",
                        "Marcus Thorne",
                        "Strategic patterns for scaling engineering organizations, cultivating high-performance culture, and driving sustainable business velocity.",
                        business,
                        "innovators-architecture.pdf",
                        3,
                        "English",
                        2024,
                        true,
                        admin,
                        "The Innovator's Architecture"
                );
            }

            if (science != null) {
                createSampleBook(
                        "Foundations of Quantum Computing & Information Theory",
                        "Elena Rostova, Ph.D.",
                        "An accessible yet rigorous exploration of quantum mechanics, qubits, entanglement, quantum algorithms, and future computing horizons.",
                        science,
                        "quantum-computing-foundations.pdf",
                        5,
                        "English",
                        2026,
                        false,
                        admin,
                        "Foundations of Quantum Computing"
                );
            }
        }

        markCatalogInitializedInDatabase();
    }

    private void scanAndRegisterBundledBooks(User admin) {
        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath*:books/*.pdf");
            log.info("Scanning for bundled PDF books in classpath:books/*.pdf (Found: {})", resources.length);

            for (Resource res : resources) {
                try {
                    String filename = res.getFilename();
                    if (filename == null || !filename.toLowerCase().endsWith(".pdf")) continue;

                    if (documentRepository.existsByFileName(filename)) {
                        log.debug("Bundled book '{}' already cataloged.", filename);
                        continue;
                    }

                    byte[] bytes;
                    try (InputStream is = res.getInputStream()) {
                        bytes = is.readAllBytes();
                    }
                    if (bytes.length == 0) continue;

                    registerPdfBook(filename, bytes, admin);
                } catch (Exception ex) {
                    log.warn("Could not load bundled resource {}: {}", res.getFilename(), ex.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("Error scanning classpath bundled books: {}", e.getMessage());
        }
    }

    private void scanLocalBooksDirectory(User admin) {
        try {
            Path[] potentialPaths = {
                Paths.get("local-books"),
                Paths.get("../local-books"),
                Paths.get("src/main/resources/books")
            };

            for (Path dir : potentialPaths) {
                if (Files.exists(dir) && Files.isDirectory(dir)) {
                    try (var stream = Files.list(dir)) {
                        stream.filter(p -> p.toString().toLowerCase().endsWith(".pdf")).forEach(pdfPath -> {
                            try {
                                String filename = pdfPath.getFileName().toString();
                                if (documentRepository.existsByFileName(filename)) return;

                                byte[] bytes = Files.readAllBytes(pdfPath);
                                registerPdfBook(filename, bytes, admin);
                            } catch (Exception e) {
                                log.warn("Failed to register local book {}: {}", pdfPath, e.getMessage());
                            }
                        });
                    }
                }
            }
        } catch (Exception ignored) {}
    }

    private void registerPdfBook(String filename, byte[] bytes, User admin) {
        try {
            // 1. Ensure file is stored in file system and DB table DOCUMENT_CONTENTS
            fileStorageService.storeDirectly(filename, bytes, "application/pdf");

            // 2. Count pages safely using PDFBox
            int pageCount = 1;
            try (PDDocument doc = Loader.loadPDF(bytes)) {
                pageCount = Math.max(1, doc.getNumberOfPages());
            } catch (Exception ignored) {
                pageCount = fileStorageService.countPdfPages(filename);
            }

            // 3. Format title from filename
            String base = filename.replaceAll("(?i)\\.pdf$", "").replace("-", " ").replace("_", " ");
            String title = formatTitle(base);
            String author = "Sourav's Library";
            if (title.contains(" - ")) {
                String[] parts = title.split(" - ", 2);
                author = parts[0].trim();
                title = parts[1].trim();
            }

            Category defaultCat = categoryRepository.findBySlug("technology-coding")
                    .orElseGet(() -> categoryRepository.findAll().stream().findFirst().orElse(null));
            Category category = resolveCategoryByTitle(title, defaultCat);

            Document doc = new Document();
            doc.setTitle(title);
            doc.setAuthor(author);
            doc.setDescription("Authentic publication '" + title + "' preserved in Sourav's Library collection.");
            doc.setCategory(category);
            doc.setFileName(filename);
            doc.setOriginalFilename(filename);
            doc.setFileSize((long) bytes.length);
            doc.setFileType("application/pdf");
            doc.setPageCount(pageCount);
            doc.setLanguage("English");
            doc.setPublishedYear(java.time.Year.now().getValue());
            doc.setIsFeatured(true);
            doc.setIsPublished(true);
            doc.setViewCount(24L);
            doc.setDownloadCount(12L);
            doc.setUploadedBy(admin);

            documentRepository.save(doc);
            log.info("✅ Registered bundled PDF book into catalog: '{}' ({} pages, {} bytes)", title, pageCount, bytes.length);
        } catch (Exception e) {
            log.warn("Error registering PDF book {}: {}", filename, e.getMessage());
        }
    }

    private String formatTitle(String raw) {
        if (raw == null || raw.isBlank()) return "Untitled Document";
        String[] words = raw.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (w.isEmpty()) continue;
            sb.append(Character.toUpperCase(w.charAt(0)));
            if (w.length() > 1) {
                sb.append(w.substring(1).toLowerCase());
            }
            sb.append(" ");
        }
        return sb.toString().trim();
    }

    private Category resolveCategoryByTitle(String title, Category defaultCat) {
        if (title == null) return defaultCat;
        String lower = title.toLowerCase();
        if (lower.contains("code") || lower.contains("spring") || lower.contains("java") || lower.contains("python") || lower.contains("tech") || lower.contains("software") || lower.contains("machine learning") || lower.contains("ai")) {
            return categoryRepository.findBySlug("technology-coding").orElse(defaultCat);
        }
        if (lower.contains("business") || lower.contains("lead") || lower.contains("innovat") || lower.contains("market") || lower.contains("finance")) {
            return categoryRepository.findBySlug("business-leadership").orElse(defaultCat);
        }
        if (lower.contains("science") || lower.contains("quantum") || lower.contains("physics") || lower.contains("bio") || lower.contains("chem")) {
            return categoryRepository.findBySlug("science-engineering").orElse(defaultCat);
        }
        if (lower.contains("fiction") || lower.contains("novel") || lower.contains("tale") || lower.contains("story")) {
            return categoryRepository.findBySlug("literature-fiction").orElse(defaultCat);
        }
        return defaultCat;
    }

    private boolean isCatalogInitializedInDatabase() {
        if (jdbcTemplate == null) return false;
        try {
            ensureMetadataTableExists();
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM APP_METADATA WHERE META_KEY = 'CATALOG_INITIALIZED'", Integer.class);
            return count != null && count > 0;
        } catch (Exception e) {
            return false;
        }
    }

    private void markCatalogInitializedInDatabase() {
        if (jdbcTemplate == null) return;
        try {
            ensureMetadataTableExists();
            jdbcTemplate.update("DELETE FROM APP_METADATA WHERE META_KEY = 'CATALOG_INITIALIZED'");
            jdbcTemplate.update("INSERT INTO APP_METADATA (META_KEY, META_VALUE) VALUES ('CATALOG_INITIALIZED', 'true')");
            log.info("Successfully recorded permanent CATALOG_INITIALIZED flag in database.");
        } catch (Exception e) {
            log.warn("Could not record initialized flag in database: {}", e.getMessage());
        }
    }

    private void ensureMetadataTableExists() {
        if (jdbcTemplate == null) return;
        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS APP_METADATA (META_KEY VARCHAR(100) PRIMARY KEY, META_VALUE VARCHAR(255))");
        } catch (Exception e) {
            // Fallback for Oracle prior to 23ai
            try {
                jdbcTemplate.execute("CREATE TABLE APP_METADATA (META_KEY VARCHAR2(100) PRIMARY KEY, META_VALUE VARCHAR2(255))");
            } catch (Exception ignored) {}
        }
    }

    private void createSampleBook(
            String title,
            String author,
            String description,
            Category category,
            String fileName,
            int pageCount,
            String language,
            int year,
            boolean isFeatured,
            User admin,
            String headerText
    ) {
        try {
            Path targetPath = fileStorageService.getDocumentsPath().resolve(fileName);
            if (!targetPath.toFile().exists()) {
                generateSamplePdf(targetPath.toFile(), title, author, headerText, pageCount);
            }

            if (targetPath.toFile().exists()) {
                try {
                    byte[] bytes = java.nio.file.Files.readAllBytes(targetPath);
                    fileStorageService.storeDirectly(fileName, bytes, "application/pdf");
                } catch (Exception ignored) {}
            }

            Document doc = new Document();
            doc.setTitle(title);
            doc.setAuthor(author);
            doc.setDescription(description);
            doc.setCategory(category);
            doc.setFileName(fileName);
            doc.setOriginalFilename(fileName);
            doc.setFileSize(targetPath.toFile().exists() ? targetPath.toFile().length() : 1024L);
            doc.setFileType("application/pdf");
            doc.setPageCount(pageCount);
            doc.setLanguage(language);
            doc.setPublishedYear(year);
            doc.setIsFeatured(isFeatured);
            doc.setIsPublished(true);
            doc.setViewCount(42L);
            doc.setDownloadCount(15L);
            doc.setUploadedBy(admin);

            documentRepository.save(doc);
            log.info("Created sample document: {}", title);
        } catch (Exception e) {
            log.warn("Could not generate sample PDF {}: {}", fileName, e.getMessage());
        }
    }

    private void generateSamplePdf(File file, String title, String author, String heading, int pages) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            for (int i = 1; i <= pages; i++) {
                PDPage page = new PDPage(PDRectangle.A4);
                doc.addPage(page);

                try (PDPageContentStream stream = new PDPageContentStream(doc, page)) {
                    // Header Bar
                    stream.setNonStrokingColor(26 / 255f, 32 / 255f, 44 / 255f);
                    stream.addRect(0, 780, 595, 62);
                    stream.fill();

                    // Header Text
                    stream.beginText();
                    stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 16);
                    stream.setNonStrokingColor(1f, 1f, 1f);
                    stream.newLineAtOffset(40, 805);
                    stream.showText("SCRIBD READER PREVIEW");
                    stream.endText();

                    // Page content
                    stream.beginText();
                    stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 20);
                    stream.setNonStrokingColor(30 / 255f, 41 / 255f, 59 / 255f);
                    stream.newLineAtOffset(40, 720);
                    stream.showText(title);
                    stream.endText();

                    stream.beginText();
                    stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE), 13);
                    stream.setNonStrokingColor(100 / 255f, 116 / 255f, 139 / 255f);
                    stream.newLineAtOffset(40, 690);
                    stream.showText("Author: " + author + "  |  Page " + i + " of " + pages);
                    stream.endText();

                    stream.beginText();
                    stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                    stream.setNonStrokingColor(51 / 255f, 65 / 255f, 85 / 255f);
                    stream.setLeading(18f);
                    stream.newLineAtOffset(40, 640);
                    stream.showText("Chapter " + i + ": Architectural Foundations & Practical Insights");
                    stream.newLine();
                    stream.newLine();
                    stream.showText("This digital document is served by the Scribd-like Spring Boot & Oracle platform.");
                    stream.newLine();
                    stream.showText("Documents are stored securely on disk and streamed with full HTTP range support.");
                    stream.newLine();
                    stream.showText("Administrators can upload new PDFs, edit book metadata, or manage visibility");
                    stream.newLine();
                    stream.showText("directly from the dedicated Admin Channel.");
                    stream.newLine();
                    stream.newLine();
                    stream.showText("Enjoy seamless reading, page flipping, bookmarks, and night mode!");
                    stream.endText();

                    // Footer
                    stream.beginText();
                    stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                    stream.setNonStrokingColor(148 / 255f, 163 / 255f, 184 / 255f);
                    stream.newLineAtOffset(250, 40);
                    stream.showText("- " + i + " -");
                    stream.endText();
                }
            }
            doc.save(file);
        }
    }
}
