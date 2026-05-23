package com.qmeetx.authenticationservice.domain.repository;

import com.qmeetx.authenticationservice.domain.models.UserAccountSync;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserAccountSyncRepository extends JpaRepository<UserAccountSync, UUID> {
    Optional<UserAccountSync> findByAuthUserId(String authUserId);
}
