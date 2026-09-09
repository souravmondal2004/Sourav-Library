package com.scribd.clone.config;

import com.scribd.clone.model.Category;
import com.scribd.clone.model.Document;
import com.scribd.clone.model.User;
import com.scribd.clone.repository.CategoryRepository;
import com.scribd.clone.repository.DocumentRepository;
import com.scribd.clone.repository.UserRepository;
import com.scribd.clone.service.FileStorageService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
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
        initSampleDocuments(admin);
    }

    private User initUsers() {
        User admin = userRepository.findByUsername("Sourav").orElse(null);

        if (admin == null) {
            admin = new User("Sourav", "sourav@lumina.local", passwordEncoder.encode("Sourav@2004"), "ROLE_ADMIN", "Sourav (Admin)");
            userRepository.save(admin);
            log.info("Initialized ADMIN account: Sourav / Sourav@2004");
        } else {
            admin.setPassword(passwordEncoder.encode("Sourav@2004"));
            admin.setRole("ROLE_ADMIN");
            admin.setFullName("Sourav (Admin)");
            userRepository.save(admin);
            log.info("Updated ADMIN account: Sourav / Sourav@2004");
        }

        if (!userRepository.existsByUsername("admin")) {
            User altAdmin = new User("admin", "admin@sourav-library.com", passwordEncoder.encode("admin123"), "ROLE_ADMIN", "Administrator");
            userRepository.save(altAdmin);
            log.info("Initialized default ADMIN account: admin / admin123");
        } else {
            User existingAdmin = userRepository.findByUsername("admin").get();
            existingAdmin.setPassword(passwordEncoder.encode("admin123"));
            existingAdmin.setRole("ROLE_ADMIN");
            userRepository.save(existingAdmin);
        }

        if (!userRepository.existsByUsername("user")) {
            User demoUser = new User("user", "user@scribd.local", passwordEncoder.encode("user123"), "ROLE_USER", "Demo Reader");
            userRepository.save(demoUser);
            log.info("Initialized default USER account: user / user123");
        }

        return admin;
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

    private void initSampleDocuments(User admin) {
        if (documentRepository.count() == 0) {
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
