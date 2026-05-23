package com.qmeetx.authenticationservice.domain.repository;
import com.qmeetx.authenticationservice.domain.enums.AuthProvider;
import com.qmeetx.authenticationservice.domain.models.Provider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProviderRepository extends JpaRepository<Provider, UUID> {
    Optional<Provider> findByProviderNameAndProviderUserId(AuthProvider providerName, String providerUserId);
}
