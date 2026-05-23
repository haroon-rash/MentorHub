package com.mentorhub.reviewratingservice.model;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity @Table(name = "user_accounts") @Getter @Setter @NoArgsConstructor
public class UserAccount {
    @Id @Column(name = "id") private UUID id;
    @Column(name = "auth_user_id", length = 120) private String authUserId;
    @Column(name = "full_name", length = 200) private String fullName;
}
