package com.scribd.clone.service;

import com.scribd.clone.dto.CategoryDto;
import com.scribd.clone.model.Category;
import com.scribd.clone.repository.CategoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
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

        return categoryRepository.save(category);
    }
}
