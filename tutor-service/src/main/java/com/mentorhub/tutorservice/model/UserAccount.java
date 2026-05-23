package com.mentorhub.tutorservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_accounts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserAccount {
    @Id
    @Column(name = "id")
    private UUID id;

    @Column(name = "auth_user_id", nullable = false, length = 120)
    private String authUserId;

    @Column(name = "full_name", length = 200)
    private String fullName;

    @Column(name = "email", length = 180)
    private String email;

    @Column(name = "role", nullable = false)
    private int role;

    @Column(name = "is_email_verified")
    private boolean isEmailVerified;

    @Column(name = "created_at_utc")
    private Instant createdAtUtc;
}
