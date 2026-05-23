package com.mentorhub.reviewratingservice.model;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity @Table(name = "tutor_profiles") @Getter @Setter @NoArgsConstructor
public class TutorProfile {
    @Id @Column(name = "\"Id\"") private UUID id;
    @Column(name = "\"UserAccountId\"") private UUID userAccountId;
}
