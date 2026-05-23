package com.mentorhub.tutorservice.controller;

import com.mentorhub.tutorservice.service.TutorCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class TutorCatalogController {

    private final TutorCatalogService tutorCatalogService;

    @GetMapping("/api/v1/tutors/approved")
    public ResponseEntity<?> getApprovedTutors() {
        return ResponseEntity.ok(Map.of("success", true, "data", tutorCatalogService.getApprovedTutors()));
    }

    @GetMapping("/api/v1/tutors/approved/{tutorProfileId}")
    public ResponseEntity<?> getApprovedTutorById(@PathVariable UUID tutorProfileId) {
        try {
            return ResponseEntity.ok(Map.of("success", true, "data", tutorCatalogService.getApprovedTutorById(tutorProfileId)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/api/v1/tutors/{id}")
    public ResponseEntity<?> getTutorById(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(tutorCatalogService.getTutorPublicProfile(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/api/v1/tutors/search")
    public ResponseEntity<?> searchTutors(
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) BigDecimal minFee,
            @RequestParam(required = false) BigDecimal maxFee,
            @RequestParam(required = false) String teachingMode,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(tutorCatalogService.searchTutors(subject, minFee, maxFee, teachingMode, location, search));
    }
}
