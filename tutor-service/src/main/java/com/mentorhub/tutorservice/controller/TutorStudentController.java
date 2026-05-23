package com.mentorhub.tutorservice.controller;

import com.mentorhub.tutorservice.model.SessionAnnouncement;
import com.mentorhub.tutorservice.model.TutorProfile;
import com.mentorhub.tutorservice.repository.SessionAnnouncementRepository;
import com.mentorhub.tutorservice.repository.StudentNameRepository;
import com.mentorhub.tutorservice.repository.TutorProfileRepository;
import com.mentorhub.tutorservice.security.GatewayAuth;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/tutor-students")
@RequiredArgsConstructor
public class TutorStudentController {

    private static final String ROLE_TUTOR = "TUTOR";
    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ROLE_SUPER_ADMIN = "SUPER_ADMIN";

    private final SessionAnnouncementRepository announcementRepository;
    private final StudentNameRepository studentNameRepository;
    private final TutorProfileRepository tutorProfileRepository;
    private final GatewayAuth gatewayAuth;

    @GetMapping("/{tutorProfileId}/students")
    public ResponseEntity<?> getMyStudents(@PathVariable UUID tutorProfileId, HttpServletRequest request) {
        ResponseEntity<?> denied = requireOwnerOrAdmin(tutorProfileId, request);
        if (denied != null) {
            return denied;
        }
        return ResponseEntity.ok(Map.of("success", true, "data", List.of()));
    }

    @PostMapping("/{tutorProfileId}/announcements")
    public ResponseEntity<?> createAnnouncement(@PathVariable UUID tutorProfileId,
                                                @RequestBody Map<String, Object> request,
                                                HttpServletRequest httpRequest) {
        ResponseEntity<?> denied = requireOwnerOrAdmin(tutorProfileId, httpRequest);
        if (denied != null) {
            return denied;
        }

        String title = Optional.ofNullable(request.get("title")).map(Object::toString).orElse("").trim();
        if (title.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Title is required"));
        }
        if (title.length() > 200) {
            title = title.substring(0, 200);
        }
        String content = "";
        if (request.get("announcementText") != null) {
            content = request.get("announcementText").toString().trim();
        } else if (request.get("content") != null) {
            content = request.get("content").toString().trim();
        }
        if (content.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Content is required"));
        }
        if (content.length() < 10 || content.length() > 1000) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Content must be between 10 and 1000 characters"));
        }

        String targetType = resolveTargetType(request);
        Object targetStudentId = request.get("targetStudentId");
        Object rawType = request.get("targetType");
        boolean specificStudent = rawType != null
                && ("2".equals(rawType.toString().trim()) || "STUDENT".equalsIgnoreCase(rawType.toString().trim()));
        if (specificStudent && (targetStudentId == null || targetStudentId.toString().isBlank())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Select a student for targeted announcements"));
        }

        var announcement = SessionAnnouncement.builder()
                .id(UUID.randomUUID())
                .tutorProfileId(tutorProfileId)
                .title(title)
                .content(content)
                .targetType(targetType)
                .createdAt(Instant.now())
                .build();
        announcementRepository.save(announcement);
        return ResponseEntity.status(201)
                .body(Map.of("success", true, "message", "Announcement sent successfully", "data", mapAnnouncement(announcement)));
    }

    @GetMapping("/{tutorProfileId}/announcements")
    public ResponseEntity<?> getAnnouncements(@PathVariable UUID tutorProfileId, HttpServletRequest request) {
        ResponseEntity<?> denied = requireOwnerOrAdmin(tutorProfileId, request);
        if (denied != null) {
            return denied;
        }

        var list = announcementRepository.findByTutorProfileIdOrderByCreatedAtDesc(tutorProfileId)
                .stream().map(this::mapAnnouncement).toList();
        return ResponseEntity.ok(Map.of("success", true, "data", list));
    }

    @DeleteMapping("/announcements/{announcementId}")
    public ResponseEntity<?> deleteAnnouncement(@PathVariable UUID announcementId, HttpServletRequest request) {
        // Resolve ownership through the existing announcement before deletion
        var existing = announcementRepository.findById(announcementId).orElse(null);
        if (existing == null) {
            // do not leak whether the id exists when the caller is unauthenticated
            ResponseEntity<?> authCheck = requireAuthentication(request);
            if (authCheck != null) {
                return authCheck;
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("success", false, "message", "Announcement not found"));
        }
        ResponseEntity<?> denied = requireOwnerOrAdmin(existing.getTutorProfileId(), request);
        if (denied != null) {
            return denied;
        }

        announcementRepository.deleteById(announcementId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Announcement deleted"));
    }

    /**
     * Allows the request only when the authenticated caller owns the {@code tutorProfileId}
     * (i.e. their auth_user_id maps to that tutor profile) OR is an admin / super admin.
     *
     * Returns the error ResponseEntity to send back when access is denied, or {@code null} when
     * access is permitted.
     */
    private ResponseEntity<?> requireOwnerOrAdmin(UUID tutorProfileId, HttpServletRequest request) {
        ResponseEntity<?> authCheck = requireAuthentication(request);
        if (authCheck != null) {
            return authCheck;
        }

        String role = gatewayAuth.getActiveRole(request);
        if (ROLE_ADMIN.equalsIgnoreCase(role) || ROLE_SUPER_ADMIN.equalsIgnoreCase(role)) {
            return null;
        }

        if (!ROLE_TUTOR.equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "message", "Switch to Tutor mode to manage announcements"));
        }

        String authUserId = gatewayAuth.getAuthUserId(request);
        TutorProfile profile = tutorProfileRepository.findByIdWithUser(tutorProfileId).orElse(null);
        if (profile == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("success", false, "message", "Tutor profile not found"));
        }
        if (profile.getUserAccount() == null
                || !authUserId.equals(profile.getUserAccount().getAuthUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "message", "You do not own this tutor profile"));
        }
        return null;
    }

    private ResponseEntity<?> requireAuthentication(HttpServletRequest request) {
        if (!gatewayAuth.isAuthenticated(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Authentication required"));
        }
        return null;
    }

    private String resolveTargetType(Map<String, Object> request) {
        Object targetStudentId = request.get("targetStudentId");
        if (targetStudentId != null && !targetStudentId.toString().isBlank()) {
            return "STUDENT:" + targetStudentId.toString().trim();
        }

        Object rawType = request.get("targetType");
        if (rawType == null) {
            return "ALL";
        }

        String type = rawType.toString().trim();
        if ("1".equals(type) || "ALL".equalsIgnoreCase(type)) {
            return "ALL";
        }
        if ("2".equals(type)) {
            throw new IllegalArgumentException("targetStudentId is required when sending to a specific student");
        }
        return type;
    }

    private Map<String, Object> mapAnnouncement(SessionAnnouncement a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("tutorProfileId", a.getTutorProfileId());
        m.put("title", a.getTitle());
        m.put("content", a.getContent());
        m.put("announcementText", a.getContent());
        m.put("targetType", a.getTargetType());
        m.put("createdAt", a.getCreatedAt());
        m.put("createdAtUtc", a.getCreatedAt());

        String tt = a.getTargetType() != null ? a.getTargetType().trim() : "";
        String targetStudentName = null;
        String targetTypeLabel;

        if (tt.equalsIgnoreCase("ALL") || "1".equals(tt)) {
            targetTypeLabel = "All Students";
        } else if (tt.regionMatches(true, 0, "STUDENT:", 0, 8)) {
            try {
                UUID studentId = UUID.fromString(tt.substring(8).trim());
                targetStudentName = lookupStudentName(studentId);
            } catch (Exception ignored) {
                // legacy or malformed value
            }
            targetTypeLabel = targetStudentName != null ? targetStudentName : "Specific student";
        } else if ("2".equals(tt)) {
            targetTypeLabel = "Specific student";
        } else {
            targetTypeLabel = "All Students";
        }

        m.put("targetTypeLabel", targetTypeLabel);
        m.put("targetStudentName", targetStudentName);
        m.put("announcementTypeLabel", "Announcement");
        return m;
    }

    private String lookupStudentName(UUID studentProfileId) {
        try {
            return studentNameRepository.findStudentDisplayName(studentProfileId);
        } catch (Exception e) {
            return null;
        }
    }
}
