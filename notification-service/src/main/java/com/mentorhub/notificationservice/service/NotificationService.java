package com.mentorhub.notificationservice.service;

import com.mentorhub.notificationservice.dto.CreateNotificationRequest;
import com.mentorhub.notificationservice.dto.NotificationResponse;
import com.mentorhub.notificationservice.model.Notification;
import com.mentorhub.notificationservice.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final Map<String, Integer> TYPE_MAP = Map.ofEntries(
            Map.entry("BOOKING_REQUESTED", 0),
            Map.entry("BOOKING_CONFIRMED", 1),
            Map.entry("BOOKING_CANCELLED", 2),
            Map.entry("BOOKING_COMPLETED", 3),
            Map.entry("REVIEW_RECEIVED", 4),
            Map.entry("TUTOR_APPROVED", 5),
            Map.entry("TUTOR_REJECTED", 6),
            Map.entry("ANNOUNCEMENT", 7),
            Map.entry("GENERAL", 8)
    );

    private static final Map<Integer, String> REVERSE_TYPE_MAP;
    static {
        var builder = new java.util.HashMap<Integer, String>();
        TYPE_MAP.forEach((k, v) -> builder.put(v, k));
        REVERSE_TYPE_MAP = Map.copyOf(builder);
    }

    @Transactional
    public NotificationResponse create(CreateNotificationRequest request) {
        var notification = Notification.builder()
                .id(UUID.randomUUID())
                .recipientAuthUserId(request.getRecipientAuthUserId())
                .type(TYPE_MAP.getOrDefault(request.getType(), 8))
                .title(request.getTitle())
                .message(request.getMessage())
                .relatedEntityId(request.getRelatedEntityId())
                .metadataJson(buildMetadataJson(request))
                .isRead(false)
                .createdAtUtc(Instant.now())
                .build();

        notificationRepository.save(notification);
        return toResponse(notification);
    }

    public List<NotificationResponse> getForUser(String authUserId) {
        return notificationRepository.findByRecipientAuthUserIdOrderByCreatedAtUtcDesc(authUserId)
                .stream().map(this::toResponse).toList();
    }

    public long getUnreadCount(String authUserId) {
        return notificationRepository.countByRecipientAuthUserIdAndIsReadFalse(authUserId);
    }

    @Transactional
    public void markRead(UUID id, String authUserId) {
        var notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (!notification.getRecipientAuthUserId().equals(authUserId)) {
            throw new IllegalArgumentException("Notification not found");
        }
        notification.setRead(true);
        notification.setReadAtUtc(Instant.now());
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllRead(String authUserId) {
        notificationRepository.markAllReadByUser(authUserId, Instant.now());
    }

    private NotificationResponse toResponse(Notification n) {
        var metadata = parseMetadata(n.getMetadataJson());
        return NotificationResponse.builder()
                .id(n.getId())
                .type(REVERSE_TYPE_MAP.getOrDefault(n.getType(), "GENERAL"))
                .title(n.getTitle())
                .message(n.getMessage())
                .isRead(n.isRead())
                .relatedEntityId(n.getRelatedEntityId())
                .createdAtUtc(n.getCreatedAtUtc())
                .readAtUtc(n.getReadAtUtc())
                .actionPath((String) metadata.get("actionPath"))
                .build();
    }

    private String buildMetadataJson(CreateNotificationRequest request) {
        if (request.getActionPath() == null) {
            return null;
        }
        var map = new HashMap<String, Object>();
        if (request.getActionPath() != null) {
            map.put("actionPath", request.getActionPath());
        }
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException ex) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseMetadata(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (JsonProcessingException ex) {
            return Map.of();
        }
    }
}
