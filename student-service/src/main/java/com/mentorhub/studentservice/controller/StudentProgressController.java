package com.mentorhub.studentservice.controller;

import com.mentorhub.studentservice.service.StudentProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/student-progress")
@RequiredArgsConstructor
public class StudentProgressController {

    private final StudentProgressService studentProgressService;

    @GetMapping
    public ResponseEntity<?> getProgress(@RequestHeader(value = "X-Auth-User-Id", required = false) String authUserId) {
        if (authUserId == null || authUserId.isBlank()) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        try {
            return ResponseEntity.ok(studentProgressService.getProgress(authUserId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/goals")
    public ResponseEntity<?> addGoal(@RequestHeader(value = "X-Auth-User-Id", required = false) String authUserId,
                                     @RequestBody Map<String, Object> request) {
        if (authUserId == null || authUserId.isBlank()) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        try {
            return ResponseEntity.ok(studentProgressService.addGoal(authUserId, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @PatchMapping("/goals/{goalId}/status")
    public ResponseEntity<?> updateGoalStatus(@RequestHeader(value = "X-Auth-User-Id", required = false) String authUserId,
                                               @PathVariable UUID goalId,
                                               @RequestBody Map<String, String> request) {
        if (authUserId == null || authUserId.isBlank()) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        try {
            return ResponseEntity.ok(studentProgressService.updateGoalStatus(authUserId, goalId, request.get("status")));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/assessments")
    public ResponseEntity<?> addAssessment(@RequestHeader(value = "X-Auth-User-Id", required = false) String authUserId,
                                            @RequestBody Map<String, Object> request) {
        if (authUserId == null || authUserId.isBlank()) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        try {
            return ResponseEntity.ok(studentProgressService.addAssessment(authUserId, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/session-notes")
    public ResponseEntity<?> addSessionNote(@RequestHeader(value = "X-Auth-User-Id", required = false) String authUserId,
                                             @RequestBody Map<String, Object> request) {
        if (authUserId == null || authUserId.isBlank()) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        try {
            return ResponseEntity.ok(studentProgressService.addSessionNote(authUserId, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }
}
