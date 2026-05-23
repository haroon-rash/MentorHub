package com.mentorhub.tutorservice.repository;

import com.mentorhub.tutorservice.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {
    Optional<UserAccount> findByAuthUserId(String authUserId);
}
