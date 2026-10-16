package com.scribd.clone;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class DocumentDownloadSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testDownloadWithoutAuthenticationIsRejectedWith401() throws Exception {
        mockMvc.perform(get("/api/documents/1/download"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "user", roles = {"USER"})
    public void testDownloadWithUserAuthenticationAllowed() throws Exception {
        // Logged-in user should not be 401 Unauthorized or 403 Forbidden.
        // It might be 200 OK or 404 (if doc 1 doesn't exist in test DB), but security allows it.
        mockMvc.perform(get("/api/documents/1/download"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertTrue(
                            status == 200 || status == 404,
                            "Status should be 200 or 404 for authenticated user, but was: " + status
                    );
                });
    }
}
