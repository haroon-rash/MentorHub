package com.mentorhub.reviewratingservice.model;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity @Table(name = "student_profiles") @Getter @Setter @NoArgsConstructor
public class StudentProfile {
    @Id @Column(name = "\"Id\"") private UUID id;
    @Column(name = "\"UserAccountId\"") private UUID userAccountId;
    @Column(name = "\"ProfilePhotoUrl\"", columnDefinition = "text") private String profilePhotoUrl;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"UserAccountId\"", referencedColumnName = "id", insertable = false, updatable = false)
    private UserAccount userAccount;
}
