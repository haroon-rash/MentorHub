package com.mentorhub.tutorservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "session_announcements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SessionAnnouncement {
    @Id private UUID id;
    @Column(name = "tutor_profile_id", nullable = false) private UUID tutorProfileId;
    @Column(name = "title", nullable = false, length = 200) private String title;
    @Column(name = "content", nullable = false, columnDefinition = "text") private String content;
    @Column(name = "target_type", length = 20) private String targetType;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
}
