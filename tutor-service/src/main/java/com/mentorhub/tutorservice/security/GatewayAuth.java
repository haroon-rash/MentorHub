package com.mentorhub.tutorservice.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Reads identity that has been validated by the API gateway.
 *
 * The .NET API gateway validates the JWT, strips any client-supplied identity headers and re-injects
 * its own trusted headers (X-MentorHub-Gateway-Auth, X-Auth-User-Id, X-User-Role).
 * Downstream Spring services without a JWT verifier rely on the gateway marker and ignore any
 * caller-supplied identity that arrives without it.
 */
@Component
public class GatewayAuth {

    public static final String GATEWAY_VERIFIED_HEADER = "X-MentorHub-Gateway-Auth";
    public static final String GATEWAY_VERIFIED_VALUE = "verified";
    public static final String AUTH_USER_ID_HEADER = "X-Auth-User-Id";
    public static final String USER_ROLE_HEADER = "X-User-Role";

    private final boolean requireGatewayTrust;

    public GatewayAuth(@Value("${app.security.require-gateway-trust:false}") boolean requireGatewayTrust) {
        this.requireGatewayTrust = requireGatewayTrust;
    }

    public boolean isGatewayVerified(HttpServletRequest request) {
        return GATEWAY_VERIFIED_VALUE.equals(request.getHeader(GATEWAY_VERIFIED_HEADER));
    }

    public String getAuthUserId(HttpServletRequest request) {
        if (requireGatewayTrust && !isGatewayVerified(request)) {
            return null;
        }
        String authUserId = request.getHeader(AUTH_USER_ID_HEADER);
        if (authUserId == null || authUserId.isBlank()) {
            return null;
        }
        return authUserId.trim();
    }

    public String getActiveRole(HttpServletRequest request) {
        if (requireGatewayTrust && !isGatewayVerified(request)) {
            return null;
        }
        String role = request.getHeader(USER_ROLE_HEADER);
        if (role == null) {
            return null;
        }
        String trimmed = role.trim().toUpperCase();
        if (trimmed.startsWith("ROLE_")) {
            trimmed = trimmed.substring(5);
        }
        return switch (trimmed) {
            case "1" -> "STUDENT";
            case "2" -> "TUTOR";
            case "3" -> "OWNER";
            case "4" -> "ADMIN";
            default -> trimmed;
        };
    }

    public boolean isAuthenticated(HttpServletRequest request) {
        return getAuthUserId(request) != null;
    }

    public boolean hasRole(HttpServletRequest request, String role) {
        var active = getActiveRole(request);
        return active != null && active.equalsIgnoreCase(role);
    }

    public boolean isRequireGatewayTrust() {
        return requireGatewayTrust;
    }
}
