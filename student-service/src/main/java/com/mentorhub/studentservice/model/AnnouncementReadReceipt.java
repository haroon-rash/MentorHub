package com.mentorhub.studentservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "announcement_read_receipts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AnnouncementReadReceipt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "announcement_id", nullable = false)
    private UUID announcementId;

    @Column(name = "student_profile_id", nullable = false)
    private UUID studentProfileId;

    @Column(name = "read_at", nullable = false)
    private Instant readAt;
}
