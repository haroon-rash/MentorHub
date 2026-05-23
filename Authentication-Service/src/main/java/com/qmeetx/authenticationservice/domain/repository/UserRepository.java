package com.qmeetx.authenticationservice.domain.repository;


import com.qmeetx.authenticationservice.domain.enums.UserReviewStatus;
import com.qmeetx.authenticationservice.domain.enums.UserRole;
import com.qmeetx.authenticationservice.domain.models.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    User findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findOneByEmail(String email);
    Optional<User> findOneByEmailIgnoreCase(String email);
    long countByRole(UserRole role);
    long countByRoleAndReviewStatus(UserRole role, UserReviewStatus reviewStatus);
    List<User> findTop10ByRoleAndReviewStatusOrderByCreatedAtDesc(UserRole role, UserReviewStatus reviewStatus);
}
