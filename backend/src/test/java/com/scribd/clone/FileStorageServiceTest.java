package com.scribd.clone;

import com.scribd.clone.service.FileStorageService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@SpringBootTest
public class FileStorageServiceTest {

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private com.scribd.clone.service.AdminService adminService;

    @Test
    public void testStoreDocumentAndCountPages() throws IOException {
        // Generate a valid 5-page PDF in memory
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PDDocument doc = new PDDocument()) {
            for (int i = 0; i < 5; i++) {
                doc.addPage(new PDPage());
            }
            doc.save(baos);
        }

        byte[] pdfBytes = baos.toByteArray();
        MockMultipartFile multipartFile = new MockMultipartFile(
                "file",
                "test-book.pdf",
                "application/pdf",
                pdfBytes
        );

        // Store document
        String storedFileName = fileStorageService.storeDocument(multipartFile);
        Assertions.assertNotNull(storedFileName);
        Assertions.assertTrue(storedFileName.endsWith(".pdf"));

        // Count pages
        int pageCount = fileStorageService.countPdfPages(storedFileName);
        Assertions.assertEquals(5, pageCount, "Page count should accurately detect 5 pages");

        // Clean up
        fileStorageService.deleteDocument(storedFileName);
    }

    @Test
    public void testAdminServiceUploadDocument() throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PDDocument doc = new PDDocument()) {
            for (int i = 0; i < 12; i++) {
                doc.addPage(new PDPage());
            }
            doc.save(baos);
        }

        MockMultipartFile pdfFile = new MockMultipartFile(
                "file",
                "Computer Networks_Organizer_2023.pdf",
                "application/pdf",
                baos.toByteArray()
        );

        com.scribd.clone.dto.DocumentResponseDto response = adminService.uploadDocument(
                pdfFile,
                null,
                "Computer Networks Organizer 2023",
                "Sourav Mondal",
                "Complete organizer book for computer networks",
                null,
                null,
                "English",
                2023,
                false,
                true,
                "Sourav"
        );

        Assertions.assertNotNull(response);
        Assertions.assertEquals("Computer Networks Organizer 2023", response.getTitle());
        Assertions.assertEquals("Sourav Mondal", response.getAuthor());
        Assertions.assertEquals(12, response.getPageCount());

        // Clean up created document
        adminService.deleteDocument(response.getId());
    }
}
