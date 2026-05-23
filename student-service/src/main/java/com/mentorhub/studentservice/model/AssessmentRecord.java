package com.mentorhub.studentservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assessment_records")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AssessmentRecord {
    @Id
    @Column(name = "\"Id\"")
    private UUID id;

    @Column(name = "\"StudentProfileId\"", nullable = false)
    private UUID studentProfileId;

    @Column(name = "\"TutorProfileId\"")
    private UUID tutorProfileId;

    @Column(name = "\"SubmittedByUserId\"", nullable = false, length = 120)
    private String submittedByUserId;

    @Column(name = "\"Title\"", nullable = false, length = 200)
    private String title;

    @Column(name = "\"Subject\"", nullable = false, length = 150)
    private String subject;

    @Column(name = "\"TopicTag\"", nullable = false, length = 200)
    private String topicTag;

    @Column(name = "\"ScoreObtained\"", nullable = false, precision = 12, scale = 2)
    private BigDecimal scoreObtained;

    @Column(name = "\"TotalScore\"", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalScore;

    @Column(name = "\"StudentConfidenceLevel\"")
    private Integer studentConfidenceLevel;

    @Column(name = "\"DateRecorded\"", nullable = false)
    private Instant dateRecorded;
}
