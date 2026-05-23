package com.mentorhub.reviewratingservice.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "batch_enrollments") @Getter @Setter @NoArgsConstructor
public class BatchEnrollment {
    @Id @Column(name = "\"Id\"") private UUID id;
    @Column(name = "\"StudentProfileId\"") private UUID studentProfileId;
    @Column(name = "\"TutorProfileId\"") private UUID tutorProfileId;
    @Column(name = "\"Status\"") private int status;
    @Column(name = "\"CompletionDateUtc\"") private Instant completionDateUtc;
    @Column(name = "\"EndDateUtc\"") private Instant endDateUtc;
    @Column(name = "\"Subject\"") private String subject;
}
