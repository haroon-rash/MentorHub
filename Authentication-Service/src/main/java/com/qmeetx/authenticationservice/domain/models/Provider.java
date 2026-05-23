package com.qmeetx.authenticationservice.domain.models;



import com.qmeetx.authenticationservice.domain.enums.AuthProvider;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(
    name = "provider",
    indexes = {
        @Index(name = "idx_provider_name_user_id", columnList = "provider_name,provider_user_id")
    }
)
public class Provider {


    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
// GOOGLE, GITHUB, FACEBOOK, etc.
    @Column(name = "provider_name", nullable = false)
    @Enumerated(EnumType.STRING)
    private AuthProvider providerName;

    // unique user ID given by provider (e.g., Google "sub")
    @Column(name ="provider_user_id",nullable = false)
    private String providerUserId;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;
}
