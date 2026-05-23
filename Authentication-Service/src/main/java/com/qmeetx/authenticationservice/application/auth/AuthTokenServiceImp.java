package com.qmeetx.authenticationservice.application.auth;

import com.qmeetx.authenticationservice.api.dto.AuthSessionDTO;
import com.qmeetx.authenticationservice.domain.models.RevokedToken;
import com.qmeetx.authenticationservice.domain.models.User;
import com.qmeetx.authenticationservice.domain.repository.RevokedTokenRepository;
import com.qmeetx.authenticationservice.domain.repository.UserRepository;
import com.qmeetx.authenticationservice.exceptions.UserNotFoundException;
import com.qmeetx.authenticationservice.infrastructure.jwt.JwtTokenProvider;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AuthTokenServiceImp implements AuthTokenService {

    private final JwtTokenProvider jwtTokenProvider;
    private final RevokedTokenRepository revokedTokenRepository;
    private final UserRepository userRepository;

    public AuthTokenServiceImp(
            JwtTokenProvider jwtTokenProvider,
            RevokedTokenRepository revokedTokenRepository,
            UserRepository userRepository
    ) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.revokedTokenRepository = revokedTokenRepository;
        this.userRepository = userRepository;
    }

    @Override
    public AuthSessionDTO issueTokens(User user) {
        String activeRole = resolveActiveRole(user);
        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getId().toString(),
                user.getEmail(),
                user.getName(),
                user.isVerified(),
                activeRole
        );
        String refreshToken = jwtTokenProvider.generateRefreshToken(
                user.getId().toString(),
                user.getEmail(),
                activeRole
        );

        return AuthSessionDTO.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .accessTokenExpiresAt(jwtTokenProvider.getExpirationTime(accessToken))
                .refreshTokenExpiresAt(jwtTokenProvider.getExpirationTime(refreshToken))
                .userId(user.getId().toString())
                .email(user.getEmail())
                .name(user.getName())
                .role(activeRole)
                .verified(user.isVerified())
                .build();
    }

    private static String resolveActiveRole(User user) {
        return user.getRole() != null ? user.getRole().name() : "STUDENT";
    }

    @Override
    @Transactional
    public AuthSessionDTO refreshSession(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken) || !jwtTokenProvider.isRefreshToken(refreshToken)) {
            throw new IllegalArgumentException("Invalid refresh token");
        }

        String refreshTokenId = jwtTokenProvider.getTokenId(refreshToken);
        if (refreshTokenId != null && revokedTokenRepository.existsByTokenId(refreshTokenId)) {
            throw new IllegalArgumentException("Refresh token has been invalidated");
        }

        String email = jwtTokenProvider.getEmailFromToken(refreshToken);
        User user = userRepository.findOneByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found for refresh token"));

        if (!user.isVerified()) {
            throw new IllegalStateException("Email not verified. Please verify OTP before continuing.");
        }

        revokeTokenIfPresent(refreshToken);
        return issueTokens(user);
    }

    @Override
    @Transactional
    public void logout(String accessToken, String refreshToken) {
        revokeTokenIfPresent(accessToken);
        revokeTokenIfPresent(refreshToken);
    }

    private void revokeTokenIfPresent(String token) {
        if (token == null || token.isBlank()) {
            return;
        }

        String normalized = token.startsWith("Bearer ") ? token.substring(7) : token;
        try {
            String tokenId = jwtTokenProvider.getTokenId(normalized);
            if (tokenId == null || revokedTokenRepository.existsByTokenId(tokenId)) {
                return;
            }

            LocalDateTime expiresAt = jwtTokenProvider.getExpirationTime(normalized);
            RevokedToken revokedToken = RevokedToken.builder()
                    .tokenId(tokenId)
                    .tokenType(jwtTokenProvider.isRefreshToken(normalized) ? "refresh" : "access")
                    .expiresAt(expiresAt)
                    .build();
            revokedTokenRepository.save(revokedToken);
        } catch (Exception ignored) {
            // Ignore invalid tokens on logout to keep endpoint idempotent.
        }
    }
}
