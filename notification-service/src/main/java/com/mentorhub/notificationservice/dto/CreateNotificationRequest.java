package com.mentorhub.notificationservice.dto;

import lombok.*;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateNotificationRequest {
    private String recipientAuthUserId;
    private String type;
    private String title;
    private String message;
    private UUID relatedEntityId;
    private String actionPath;
}
