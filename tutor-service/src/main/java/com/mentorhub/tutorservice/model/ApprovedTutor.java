package com.mentorhub.tutorservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "approved_tutors")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ApprovedTutor {
    @Id private UUID id;
    @Column(name = "tutor_profile_id", nullable = false) private UUID tutorProfileId;
    @Column(name = "auth_user_id", length = 120) private String authUserId;
    @Column(name = "full_name", length = 200) private String fullName;
    @Column(name = "email", length = 200) private String email;
    @Column(name = "status", length = 50) private String status;
    @Column(name = "profile_photo_url", columnDefinition = "text") private String profilePhotoUrl;
    @Column(name = "highest_degree", length = 150) private String highestDegree;
    @Column(name = "years_of_experience") private Integer yearsOfExperience;
    @Column(name = "hourly_fee", precision = 12, scale = 2) private BigDecimal hourlyFee;
    @Column(name = "subjects_csv", columnDefinition = "text") private String subjectsCsv;
    @Column(name = "bio", columnDefinition = "text") private String bio;
    @Column(name = "teaching_methodology", columnDefinition = "text") private String teachingMethodology;
    @Column(name = "teaching_mode", length = 50) private String teachingMode;
    @Column(name = "in_person_location", length = 200) private String inPersonLocation;
    @Column(name = "average_rating", precision = 3, scale = 1) private BigDecimal averageRating;
    @Column(name = "review_count") private Integer reviewCount;
    @Column(name = "reviewed_at_utc") private Instant reviewedAtUtc;
    @Column(name = "synced_at_utc") private Instant syncedAtUtc;
}
