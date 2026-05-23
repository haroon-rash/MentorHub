package com.mentorhub.reviewratingservice.controller;
import com.mentorhub.reviewratingservice.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/reviews") @RequiredArgsConstructor
public class ReviewController {
    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<?> createReview(@RequestHeader(value = "X-Auth-User-Id", required = false) String authUserId, @RequestBody Map<String, Object> req) {
        if (authUserId == null) return ResponseEntity.status(401).build();
        try { return ResponseEntity.ok(reviewService.createReview(authUserId, req)); }
        catch (IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
        catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Could not save review. Please try again."));
        }
    }

    @GetMapping("/tutor/{tutorProfileId}")
    public ResponseEntity<?> getTutorReviews(@PathVariable UUID tutorProfileId) {
        return ResponseEntity.ok(reviewService.getTutorReviews(tutorProfileId));
    }
}
