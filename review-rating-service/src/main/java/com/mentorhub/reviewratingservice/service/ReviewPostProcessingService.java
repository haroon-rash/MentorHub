package com.mentorhub.reviewratingservice.service;

import com.mentorhub.reviewratingservice.model.Review;
import com.mentorhub.reviewratingservice.repository.BatchEnrollmentRepository;
import com.mentorhub.reviewratingservice.repository.ReviewRepository;
import com.mentorhub.reviewratingservice.repository.TutorProfileRepository;
import com.mentorhub.reviewratingservice.repository.TutorRatingSyncRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReviewPostProcessingService {
    private final ReviewRepository reviewRepository;
    private final BatchEnrollmentRepository batchEnrollmentRepository;
    private final TutorProfileRepository tutorProfileRepository;
    private final TutorRatingSyncRepository tutorRatingSyncRepository;
    private final RestTemplate restTemplate;

    @Value("${app.services.ai-sentiment-url:http://localhost:8093}")
    private String aiUrl;
    @Value("${app.services.tutor-service-url:http://localhost:8087}")
    private String tutorUrl;
    @Value("${app.services.notification-service-url:http://localhost:8091}")
    private String notifUrl;
    @Value("${app.services.recommendation-service-url:http://localhost:8000}")
    private String recommendationUrl;

    @Async
    public void processReviewAsync(
            UUID reviewId,
            String studentAuthUserId,
            String studentFullName,
            int rating,
            String comment) {
        var review = reviewRepository.findById(reviewId).orElse(null);
        if (review == null) return;

        try {
            var aiResponse = restTemplate.postForObject(
                    aiUrl + "/api/v1/analyze",
                    Map.of("text", comment, "rating", rating),
                    Map.class);
            if (aiResponse != null) {
                review.setSentiment((String) aiResponse.getOrDefault("sentiment", "NEUTRAL"));
                review.setSentimentConfidence(Double.parseDouble(aiResponse.getOrDefault("confidence", 0.5).toString()));
                reviewRepository.save(review);
            }
        } catch (Exception e) {
            System.err.println("Background AI sentiment failed: " + e.getMessage());
        }

        UUID tutorProfileId = review.getTutorProfileId();
        try {
            var allReviews = reviewRepository.findByTutorProfileIdOrderByCreatedAtUtcDesc(tutorProfileId);
            double avg = allReviews.stream().mapToInt(Review::getRating).average().orElse(0);
            int count = allReviews.size();
            tutorRatingSyncRepository.syncTutorRating(tutorProfileId, avg, count);
            restTemplate.patchForObject(
                    tutorUrl + "/api/internal/tutors/" + tutorProfileId + "/rating",
                    Map.of(
                            "averageRating", BigDecimal.valueOf(avg).setScale(1, RoundingMode.HALF_UP),
                            "reviewCount", count),
                    Map.class);
        } catch (Exception e) {
            System.err.println("Background tutor rating update failed: " + e.getMessage());
        }

        try {
            String tutorAuthUserId = tutorProfileRepository.findAuthUserIdByTutorProfileId(tutorProfileId).orElse(null);
            if (tutorAuthUserId != null) {
                restTemplate.postForObject(
                        notifUrl + "/api/internal/notifications",
                        Map.of(
                                "recipientAuthUserId", tutorAuthUserId,
                                "type", "REVIEW_RECEIVED",
                                "title", "New Review",
                                "message", studentFullName + " gave you " + rating + "/5 stars",
                                "relatedEntityId", review.getId().toString()),
                        Map.class);
            }
        } catch (Exception e) {
            System.err.println("Background tutor notification failed: " + e.getMessage());
        }

        UUID enrollmentId = review.getBatchEnrollmentId();
        if (enrollmentId != null) {
            try {
                var enrollment = batchEnrollmentRepository.findById(enrollmentId).orElse(null);
                var subject = enrollment != null && enrollment.getSubject() != null ? enrollment.getSubject() : "";
                var headers = new HttpHeaders();
                headers.set("X-Auth-User-Id", studentAuthUserId);
                var entity = new HttpEntity<>(
                        Map.of(
                                "tutor_profile_id", tutorProfileId.toString(),
                                "interaction_type", "review_submitted",
                                "subject", subject,
                                "metadata", Map.of(
                                        "subject", subject,
                                        "rating", rating,
                                        "enrollmentId", enrollmentId.toString())),
                        headers);
                restTemplate.postForObject(
                        recommendationUrl + "/api/v1/recommendations/interactions",
                        entity,
                        Map.class);
            } catch (Exception e) {
                System.err.println("Background recommendation interaction failed: " + e.getMessage());
            }
        }

        try {
            restTemplate.postForObject(recommendationUrl + "/api/v1/recommendations/recompute", null, Map.class);
        } catch (Exception e) {
            System.err.println("Background recommendation recompute failed: " + e.getMessage());
        }
    }
}
