package com.mentorhub.notificationservice.dto;

import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationResponse {
    private UUID id;
    private String type;
    private String title;
    private String message;
    private boolean isRead;
    private UUID relatedEntityId;
    private Instant createdAtUtc;
    private Instant readAtUtc;
    private String actionPath;
}
