package com.mentorhub.reviewratingservice.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "reviews") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Review {
    @Id @Column(name = "\"Id\"") private UUID id;
    @Column(name = "\"StudentProfileId\"") private UUID studentProfileId;
    @Column(name = "\"TutorProfileId\"") private UUID tutorProfileId;
    @Column(name = "\"BookingId\"") private UUID bookingId;
    @Column(name = "\"BatchEnrollmentId\"") private UUID batchEnrollmentId;
    @Column(name = "\"ReviewType\"") private int reviewType;
    @Column(name = "\"Rating\"") private int rating;
    @Column(name = "\"Comment\"", columnDefinition = "text") private String comment;
    @Column(name = "\"Sentiment\"", length = 20) private String sentiment;
    @Column(name = "\"SentimentConfidence\"") private Double sentimentConfidence;
    @Column(name = "\"ReviewWindowExpiresAtUtc\"") private Instant reviewWindowExpiresAtUtc;
    @Column(name = "\"CreatedAtUtc\"") private Instant createdAtUtc;
}
