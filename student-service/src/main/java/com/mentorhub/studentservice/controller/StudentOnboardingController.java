package com.mentorhub.studentservice.controller;

import com.mentorhub.studentservice.service.StudentOnboardingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/student-onboarding")
@RequiredArgsConstructor
public class StudentOnboardingController {

    private final StudentOnboardingService studentOnboardingService;

    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(@RequestHeader(value = "X-Auth-User-Id", required = false) String authUserId) {
        if (authUserId == null || authUserId.isBlank()) return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));

        var profile = studentOnboardingService.getStudentProfile(authUserId);
        if (profile == null) return ResponseEntity.notFound().build();

        return ResponseEntity.ok(Map.of("success", true, "data", profile));
    }

    @PutMapping("/me")
    public ResponseEntity<?> upsertMyProfile(@RequestHeader(value = "X-Auth-User-Id", required = false) String authUserId,
                                              @RequestBody Map<String, Object> request) {
        if (authUserId == null || authUserId.isBlank()) return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));

        try {
            var profile = studentOnboardingService.upsertStudentProfile(authUserId, request);
            return ResponseEntity.ok(Map.of("success", true, "data", profile, "message", "Student profile saved successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
