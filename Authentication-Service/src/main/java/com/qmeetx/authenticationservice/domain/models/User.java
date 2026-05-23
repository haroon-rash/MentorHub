package com.qmeetx.authenticationservice.domain.models;


import com.qmeetx.authenticationservice.domain.enums.UserRole;
import com.qmeetx.authenticationservice.domain.enums.UserReviewStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(
  name = "signup_user",
  indexes = {
    @Index(name = "idx_signup_user_email", columnList = "user_email"),
    @Index(name = "idx_signup_user_role_verified", columnList = "role,is_verified")
  }
)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "user_id",nullable = false)
    private UUID id;

    @Column(name = "user_name",nullable = false)
    private String name;

    @Column(name="user_email",unique = true,nullable = false)
    private String email;

    @Column(name="user_password")
    private String password;


    @Column(name = "is_verified", nullable = false)
    private boolean isVerified=false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "role")
    @Enumerated(EnumType.STRING)
    private UserRole role;

    @Column(name = "review_status")
    @Enumerated(EnumType.STRING)
    private UserReviewStatus reviewStatus;



    // 🔑 one user can have multiple providers
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Set<Provider> providers = new HashSet<>();
}


  /*


  /*  @Column(name = "user_phoneNo",nullable = false)
    private String phone;
*/
   /* @ManyToOne
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;
    @Column(name="user_industry",nullable = false)
    private String industry;
*/






