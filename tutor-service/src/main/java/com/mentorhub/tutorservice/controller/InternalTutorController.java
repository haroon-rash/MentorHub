package com.mentorhub.tutorservice.controller;

import com.mentorhub.tutorservice.security.InternalApiKeyGuard;
import com.mentorhub.tutorservice.service.TutorCatalogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
public class InternalTutorController {

    private final TutorCatalogService tutorCatalogService;
    private final InternalApiKeyGuard internalApiKeyGuard;

    @PostMapping("/tutor-catalog/sync")
    public ResponseEntity<?> syncCatalog(@RequestBody Map<String, Object> data, HttpServletRequest request) {
        if (!internalApiKeyGuard.isValid(request)) {
            return unauthorized();
        }
        tutorCatalogService.syncCatalog(data);
        return ResponseEntity.ok(Map.of("success", true, "message", "Catalog synced"));
    }

    @PatchMapping("/tutors/{tutorProfileId}/rating")
    public ResponseEntity<?> updateRating(@PathVariable UUID tutorProfileId,
                                          @RequestBody Map<String, Object> data,
                                          HttpServletRequest request) {
        if (!internalApiKeyGuard.isValid(request)) {
            return unauthorized();
        }
        Object ratingValue = data.get("averageRating");
        Object reviewValue = data.get("reviewCount");
        if (ratingValue == null || reviewValue == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "averageRating and reviewCount are required"));
        }
        BigDecimal avgRating;
        int reviewCount;
        try {
            avgRating = new BigDecimal(ratingValue.toString());
            reviewCount = Integer.parseInt(reviewValue.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Invalid rating payload"));
        }
        tutorCatalogService.updateRating(tutorProfileId, avgRating, reviewCount);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private static ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("success", false, "message", "Internal API key required"));
    }
}
