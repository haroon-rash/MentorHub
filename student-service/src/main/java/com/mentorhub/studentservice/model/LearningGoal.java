package com.mentorhub.studentservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "learning_goals")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LearningGoal {
    @Id
    @Column(name = "\"Id\"")
    private UUID id;

    @Column(name = "\"StudentProfileId\"", nullable = false)
    private UUID studentProfileId;

    @Column(name = "student_profile_id", nullable = false)
    private UUID studentProfileIdMirror;

    @Column(name = "\"Title\"", nullable = false, length = 200)
    private String title;

    @Column(name = "\"Description\"", length = 1500)
    private String description;

    @Column(name = "\"TargetDate\"")
    private Instant targetDate;

    @Column(name = "\"Status\"", nullable = false, length = 50)
    private String status;

    @Column(name = "\"CreatedAtUtc\"", nullable = false)
    private Instant createdAtUtc;

    /** Mirror column kept in sync for legacy snake_case schema constraints */
    @Column(name = "created_at_utc", nullable = false)
    private Instant createdAtUtcMirror;

    @PrePersist
    @PreUpdate
    void mirrorColumns() {
        if (studentProfileId != null) {
            studentProfileIdMirror = studentProfileId;
        }
        if (createdAtUtc != null) {
            createdAtUtcMirror = createdAtUtc;
        }
    }
}
