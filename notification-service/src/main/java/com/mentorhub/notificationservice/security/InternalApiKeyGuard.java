package com.mentorhub.notificationservice.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Guards the /api/internal/** endpoints with a shared secret API key.
 *
 * Fails closed by design: when {@code app.internal-api.key} is not configured, ALL internal
 * requests are rejected.  This prevents accidental exposure if the key is omitted from production
 * configuration.
 */
@Component
public class InternalApiKeyGuard {

    public static final String INTERNAL_API_KEY_HEADER = "X-Internal-Api-Key";

    private final String configuredKey;

    public InternalApiKeyGuard(@Value("${app.internal-api.key:}") String configuredKey) {
        this.configuredKey = configuredKey == null ? "" : configuredKey.trim();
    }

    public boolean isValid(HttpServletRequest request) {
        if (configuredKey.isEmpty()) {
            return false;
        }
        var provided = request.getHeader(INTERNAL_API_KEY_HEADER);
        if (provided == null || provided.isEmpty()) {
            return false;
        }
        return constantTimeEquals(provided, configuredKey);
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}
