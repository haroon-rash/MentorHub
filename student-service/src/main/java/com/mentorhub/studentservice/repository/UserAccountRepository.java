package com.mentorhub.studentservice.repository;

import com.mentorhub.studentservice.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {
    Optional<UserAccount> findByAuthUserId(String authUserId);
}
