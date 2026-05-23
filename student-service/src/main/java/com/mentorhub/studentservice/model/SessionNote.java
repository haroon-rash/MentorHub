package com.mentorhub.studentservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "session_notes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SessionNote {
    @Id
    @Column(name = "\"Id\"")
    private UUID id;

    @Column(name = "\"BookingId\"", nullable = false, unique = true)
    private UUID bookingId;

    @Column(name = "\"StudentProfileId\"", nullable = false)
    private UUID studentProfileId;

    @Column(name = "\"TutorProfileId\"", nullable = false)
    private UUID tutorProfileId;

    @Column(name = "\"TopicsCovered\"", nullable = false, length = 1000)
    private String topicsCovered;

    @Column(name = "\"Remarks\"", nullable = false, length = 2000)
    private String remarks;

    @Column(name = "\"AreasForImprovement\"", length = 1000)
    private String areasForImprovement;

    @Column(name = "\"ResourceLinksCsv\"", length = 2000)
    private String resourceLinksCsv;

    @Column(name = "\"CreatedAtUtc\"", nullable = false)
    private Instant createdAtUtc;
}
