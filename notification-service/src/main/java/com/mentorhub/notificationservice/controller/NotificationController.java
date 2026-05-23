package com.mentorhub.notificationservice.controller;

import com.mentorhub.notificationservice.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<?> getNotifications(@RequestHeader(value = "X-Auth-User-Id", required = false) String authUserId) {
        if (authUserId == null || authUserId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        var notifications = notificationService.getForUser(authUserId);
        var unreadCount = notificationService.getUnreadCount(authUserId);
        return ResponseEntity.ok(Map.of("notifications", notifications, "unreadCount", unreadCount));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable UUID id,
                                      @RequestHeader(value = "X-Auth-User-Id", required = false) String authUserId) {
        if (authUserId == null || authUserId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        try {
            notificationService.markRead(id, authUserId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/read-all")
    public ResponseEntity<?> markAllRead(@RequestHeader(value = "X-Auth-User-Id", required = false) String authUserId) {
        if (authUserId == null || authUserId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        notificationService.markAllRead(authUserId);
        return ResponseEntity.noContent().build();
    }
}
