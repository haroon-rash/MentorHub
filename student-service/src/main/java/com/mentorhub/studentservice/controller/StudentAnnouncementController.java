package com.mentorhub.studentservice.controller;

import com.mentorhub.studentservice.model.AnnouncementReadReceipt;
import com.mentorhub.studentservice.repository.AnnouncementReadReceiptRepository;
import com.mentorhub.studentservice.repository.StudentProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/student-announcements")
@RequiredArgsConstructor
public class StudentAnnouncementController {

    private final StudentProfileRepository studentProfileRepository;
    private final AnnouncementReadReceiptRepository readReceiptRepository;
    private final com.mentorhub.studentservice.repository.SessionAnnouncementRepository announcementRepository;

    @GetMapping("/my-tutors")
    public ResponseEntity<?> getMyTutors(@RequestHeader(value = "X-Auth-User-Id", required = false) String authUserId) {
        if (authUserId == null || authUserId.isBlank()) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        // Returns empty list — tutor data will be loaded from Tutor Service via gateway by the frontend
        return ResponseEntity.ok(Map.of("success", true, "data", List.of()));
    }

    @GetMapping
    public ResponseEntity<?> getMyAnnouncements(@RequestHeader(value = "X-Auth-User-Id", required = false) String authUserId) {
        if (authUserId == null || authUserId.isBlank()) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        var announcements = announcementRepository.findAllByOrderByCreatedAtDesc();
        return ResponseEntity.ok(Map.of("success", true, "data", announcements));
    }

    @GetMapping("/tutor/{tutorProfileId}")
    public ResponseEntity<?> getAnnouncementsFromTutor(@PathVariable UUID tutorProfileId,
                                                        @RequestHeader(value = "X-Auth-User-Id", required = false) String authUserId) {
        if (authUserId == null || authUserId.isBlank()) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        var announcements = announcementRepository.findByTutorProfileIdOrderByCreatedAtDesc(tutorProfileId);
        return ResponseEntity.ok(Map.of("success", true, "data", announcements));
    }

    @PostMapping("/{announcementId}/mark-read")
    public ResponseEntity<?> markAsRead(@PathVariable UUID announcementId,
                                         @RequestHeader(value = "X-Auth-User-Id", required = false) String authUserId) {
        if (authUserId == null || authUserId.isBlank()) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        var profile = studentProfileRepository.findByAuthUserId(authUserId);
        if (profile.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "Student profile not found"));

        if (!readReceiptRepository.existsByAnnouncementIdAndStudentProfileId(announcementId, profile.get().getId())) {
            readReceiptRepository.save(AnnouncementReadReceipt.builder()
                    .announcementId(announcementId)
                    .studentProfileId(profile.get().getId())
                    .readAt(Instant.now())
                    .build());
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Announcement marked as read"));
    }
}
