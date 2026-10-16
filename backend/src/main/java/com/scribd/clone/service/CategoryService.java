package com.scribd.clone.service;

import com.scribd.clone.dto.CategoryDto;
import com.scribd.clone.model.Category;
import com.scribd.clone.model.Document;
import com.scribd.clone.repository.CategoryRepository;
import com.scribd.clone.repository.DocumentRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final DocumentRepository documentRepository;
    private final CategorySyncService categorySyncService;

    public CategoryService(
            CategoryRepository categoryRepository,
            DocumentRepository documentRepository,
            CategorySyncService categorySyncService
    ) {
        this.categoryRepository = categoryRepository;
        this.documentRepository = documentRepository;
        this.categorySyncService = categorySyncService;
    }

    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    public Category getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Category not found with id: " + id));
    }

    public Category createCategory(CategoryDto dto) {
        String slug = dto.getSlug();
        if (slug == null || slug.isBlank()) {
            slug = dto.getName().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        }
        if (categoryRepository.existsBySlug(slug)) {
            slug = slug + "-" + System.currentTimeMillis();
        }

        Category category = new Category(
                dto.getName(),
                slug,
                dto.getDescription(),
                dto.getIcon() != null ? dto.getIcon() : "book"
        );

        Category saved = categoryRepository.save(category);

        if (categorySyncService != null) {
            categorySyncService.syncCategoriesToGoogleDrive();
        }

        return saved;
    }

    public void deleteCategory(Long id) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Category not found with id: " + id));

        // Reassign any documents currently linked to this category to a fallback category
        List<Category> allCategories = categoryRepository.findAll();
        Category fallback = allCategories.stream()
                .filter(c -> !c.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (fallback != null && documentRepository != null) {
            List<Document> attachedDocs = documentRepository.findAll().stream()
                    .filter(d -> d.getCategory() != null && d.getCategory().getId().equals(id))
                    .collect(Collectors.toList());
            for (Document doc : attachedDocs) {
                doc.setCategory(fallback);
                documentRepository.save(doc);
            }
        }

        categoryRepository.delete(cat);

        if (categorySyncService != null) {
            categorySyncService.syncCategoriesToGoogleDrive();
        }
    }
}
