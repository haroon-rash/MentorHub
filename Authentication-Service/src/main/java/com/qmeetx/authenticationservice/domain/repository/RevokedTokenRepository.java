package com.qmeetx.authenticationservice.domain.repository;

import com.qmeetx.authenticationservice.domain.models.RevokedToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.UUID;

public interface RevokedTokenRepository extends JpaRepository<RevokedToken, UUID> {
    boolean existsByTokenId(String tokenId);
    long deleteByExpiresAtBefore(LocalDateTime cutoff);
}
