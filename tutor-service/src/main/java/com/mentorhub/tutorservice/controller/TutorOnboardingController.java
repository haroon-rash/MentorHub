package com.mentorhub.tutorservice.controller;

import com.mentorhub.tutorservice.service.TutorOnboardingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/tutor-onboarding")
@RequiredArgsConstructor
public class TutorOnboardingController {

    private final TutorOnboardingService tutorOnboardingService;

    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(@RequestHeader(value = "X-Auth-User-Id", required = false) String authUserId) {
        if (authUserId == null || authUserId.isBlank()) return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));
        var profile = tutorOnboardingService.getTutorProfile(authUserId);
        if (profile == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("success", true, "data", profile));
    }

    @PutMapping("/me")
    public ResponseEntity<?> upsertMyProfile(@RequestHeader(value = "X-Auth-User-Id", required = false) String authUserId,
                                              @RequestBody Map<String, Object> request) {
        if (authUserId == null || authUserId.isBlank()) return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));
        try {
            var profile = tutorOnboardingService.upsertTutorProfile(authUserId, request);
            return ResponseEntity.ok(Map.of("success", true, "data", profile, "message", "Tutor profile submitted for verification"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", "Could not save tutor profile. Please try again."));
        }
    }
}
