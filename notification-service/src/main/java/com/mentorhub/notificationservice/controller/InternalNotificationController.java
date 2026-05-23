package com.mentorhub.notificationservice.controller;

import com.mentorhub.notificationservice.dto.CreateNotificationRequest;
import com.mentorhub.notificationservice.security.InternalApiKeyGuard;
import com.mentorhub.notificationservice.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/internal/notifications")
@RequiredArgsConstructor
public class InternalNotificationController {

    private final NotificationService notificationService;
    private final InternalApiKeyGuard internalApiKeyGuard;

    @PostMapping
    public ResponseEntity<?> createNotification(@RequestBody CreateNotificationRequest request,
                                                HttpServletRequest httpRequest) {
        if (!internalApiKeyGuard.isValid(httpRequest)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Internal API key required"));
        }
        var response = notificationService.create(request);
        return ResponseEntity.ok(response);
    }
}
