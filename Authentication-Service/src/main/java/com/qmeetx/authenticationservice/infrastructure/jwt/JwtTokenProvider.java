package com.qmeetx.authenticationservice.infrastructure.jwt;

import com.qmeetx.authenticationservice.domain.Utils.keyloader;
import io.jsonwebtoken.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.PrivateKey;
import java.security.PublicKey;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
public class JwtTokenProvider {

    private static final String CLAIM_ID = "id";
    private static final String CLAIM_NAME = "name";
    private static final String CLAIM_IS_VERIFIED = "isVerified";
    private static final String CLAIM_ROLE = "role";
    private static final String CLAIM_TOKEN_TYPE = "tokenType";
    private static final String CLAIM_TOKEN_ID = "tokenId";
    private static final String ACCESS_TOKEN = "access";
    private static final String REFRESH_TOKEN = "refresh";
    private static final String PASSWORD_RESET_TOKEN = "password_reset";

    private final long accessExpirationMs;
    private final long refreshExpirationMs;
    private final PrivateKey privateKey;
    private final PublicKey publicKey;

    public JwtTokenProvider(
            keyloader keyLoader,
            @Value("${security.jwt.access-expiration-ms}") long accessExpirationMs,
            @Value("${security.jwt.refresh-expiration-ms}") long refreshExpirationMs
    ) throws Exception {
        this.privateKey = keyLoader.loadKey();
        this.publicKey = keyLoader.loadPublicKey();
        this.accessExpirationMs = accessExpirationMs;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    public String generateAccessToken(String id, String email, String name, boolean isVerified, String role) {
        return buildToken(id, email, name, isVerified, role, ACCESS_TOKEN, accessExpirationMs);
    }

    public String generateRefreshToken(String id, String email, String role) {
        return buildToken(id, email, "", true, role, REFRESH_TOKEN, refreshExpirationMs);
    }

    public String generatePasswordResetToken(String id, String email, String role, long ttlMs) {
        return buildToken(id, email, "", true, role, PASSWORD_RESET_TOKEN, ttlMs);
    }

    public boolean validatePasswordResetToken(String token) {
        if (!validateToken(token)) {
            return false;
        }
        try {
            return PASSWORD_RESET_TOKEN.equals(parseClaims(token).get(CLAIM_TOKEN_TYPE));
        } catch (Exception ex) {
            return false;
        }
    }

    // Backward compatibility for older service calls.
    public String generateToken(String id, String email, String name, boolean isVerified, String role) {
        return generateAccessToken(id, email, name, isVerified, role);
    }

    private String buildToken(String id, String email, String name, boolean isVerified, String role, String tokenType, long ttlMs) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + ttlMs);

        return Jwts.builder()
                .setSubject(email)
                .addClaims(Map.of(
                        CLAIM_ID, id,
                        CLAIM_NAME, name != null ? name : "",
                        CLAIM_IS_VERIFIED, isVerified,
                        CLAIM_ROLE, role,
                        CLAIM_TOKEN_TYPE, tokenType,
                        CLAIM_TOKEN_ID, UUID.randomUUID().toString()
                ))
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(privateKey, SignatureAlgorithm.RS256)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.info("Token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.info("Unsupported token: {}", e.getMessage());
        } catch (MalformedJwtException e) {
            log.info("JWT malformed: {}", e.getMessage());
        } catch (SignatureException e) {
            log.info("Invalid JWT signature: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.info("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }

    public String getEmailFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    public String getRoleFromToken(String token) {
        return (String) parseClaims(token).get(CLAIM_ROLE);
    }

    public String getIdFromToken(String token) {
        Object val = parseClaims(token).get(CLAIM_ID);
        return val != null ? String.valueOf(val) : null;
    }

    public boolean isVerifiedFromToken(String token) {
        Object val = parseClaims(token).get(CLAIM_IS_VERIFIED);
        return val instanceof Boolean && (Boolean) val;
    }

    public String getTokenId(String token) {
        Object val = parseClaimsAllowExpired(token).get(CLAIM_TOKEN_ID);
        return val instanceof String ? (String) val : null;
    }

    public boolean isRefreshToken(String token) {
        Object val = parseClaims(token).get(CLAIM_TOKEN_TYPE);
        return REFRESH_TOKEN.equals(val);
    }

    public LocalDateTime getExpirationTime(String token) {
        Date expiration = parseClaimsAllowExpired(token).getExpiration();
        return LocalDateTime.ofInstant(Instant.ofEpochMilli(expiration.getTime()), ZoneId.systemDefault());
    }

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder().setSigningKey(publicKey).build()
                .parseClaimsJws(token).getBody();
    }

    private Claims parseClaimsAllowExpired(String token) {
        try {
            return parseClaims(token);
        } catch (ExpiredJwtException ex) {
            return ex.getClaims();
        }
    }
}
