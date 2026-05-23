package com.qmeetx.authenticationservice.domain.Utils;/*
package com.qmeetx.authservice.domain.Utils;

import java.security.SecureRandom;

public class TenantIdGenerator {

    private static final SecureRandom RANDOM = new SecureRandom();

    // To Generate a TenantID which is Unique

    public static String generateTenantId(String organizationName) {
        String cleaned = sanitizeBaseName(organizationName);
        int numericSuffix = 100 + RANDOM.nextInt(900); // 100 to 999 inclusive
        return cleaned + "-" + numericSuffix;
    }

    private static String sanitizeBaseName(String name) {
        return name.trim()
                .toLowerCase()
                .replaceAll("[^a-z0-9]", "-")   // replace non-alphanumeric chars with hyphen
                .replaceAll("-{2,}", "-")       // collapse multiple hyphens
                .replaceAll("^-|-$", "");       // trim leading/trailing hyphen
    }
    }


*/
