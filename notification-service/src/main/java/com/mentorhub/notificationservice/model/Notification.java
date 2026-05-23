package com.mentorhub.notificationservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {

    @Id
    @Column(name = "id")
    private UUID id;

    @Column(name = "recipient_auth_user_id", nullable = false, length = 120)
    private String recipientAuthUserId;

    @Column(name = "notification_type", nullable = false)
    private int type;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "message", nullable = false, columnDefinition = "text")
    private String message;

    @Column(name = "is_read", nullable = false)
    private boolean isRead;

    @Column(name = "related_entity_id")
    private UUID relatedEntityId;

    @Column(name = "created_at_utc", nullable = false)
    private Instant createdAtUtc;

    @Column(name = "read_at_utc")
    private Instant readAtUtc;

    @Column(name = "metadata_json", columnDefinition = "text")
    private String metadataJson;
}
