package com.qmeetx.authenticationservice.domain.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Entity used to synchronize user data with the 'user_accounts' table
 * shared with .NET and other microservices.
 * Uses snake_case column names mapped to the snake_case alias columns
 * that are kept in sync with .NET PascalCase columns via DB trigger.
 */
@Entity
@Table(name = "user_accounts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserAccountSync {

    @Id
    @Column(name = "id")
    private UUID id;

    @Column(name = "auth_user_id", nullable = false, length = 120)
    private String authUserId;

    @Column(name = "full_name", length = 200)
    private String fullName;

    @Column(name = "email", length = 200)
    private String email;

    @Column(name = "role")
    private int role;

    @Column(name = "is_email_verified")
    private boolean isEmailVerified;

    @Column(name = "created_at_utc")
    private Instant createdAtUtc;
}
