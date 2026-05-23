package com.mentorhub.reviewratingservice.service;

import com.mentorhub.reviewratingservice.model.*;
import com.mentorhub.reviewratingservice.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor
public class ReviewService {
    private static final int REVIEW_WINDOW_DAYS = 10;
    private static final int STATUS_COMPLETED = 4;
    private static final int STATUS_EXPIRED = 2;
    private static final int STATUS_WITHDRAWN = 5;
    private static final int REVIEW_TYPE_ENROLLMENT = 1;

    private final ReviewRepository reviewRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final BatchEnrollmentRepository batchEnrollmentRepository;
    private final ReviewPostProcessingService reviewPostProcessingService;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public Map<String, Object> createReview(String studentAuthUserId, Map<String, Object> req) {
        int rating = Integer.parseInt(req.get("rating").toString());
        if (rating < 1 || rating > 5) throw new IllegalArgumentException("Rating must be 1-5");
        UUID tutorProfileId = UUID.fromString(req.get("tutorProfileId").toString());
        String comment = req.getOrDefault("comment", "").toString().trim();

        var student = studentProfileRepository.findByAuthUserId(studentAuthUserId)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        var tutor = tutorProfileRepository.findById(tutorProfileId)
                .orElseThrow(() -> new IllegalArgumentException("Tutor not found"));
        if (student.getUserAccountId() != null && student.getUserAccountId().equals(tutor.getUserAccountId())) {
            throw new IllegalArgumentException(
                    "You cannot review your own tutor profile. Switch profiles or choose a different tutor.");
        }

        UUID bookingId = null;
        UUID enrollmentId = null;
        int reviewType = 0;

        if (req.containsKey("enrollmentId") && req.get("enrollmentId") != null) {
            enrollmentId = UUID.fromString(req.get("enrollmentId").toString());
            reviewType = REVIEW_TYPE_ENROLLMENT;
            validateEnrollmentReview(student.getId(), enrollmentId, tutorProfileId);
        } else if (req.containsKey("bookingId") && req.get("bookingId") != null) {
            bookingId = UUID.fromString(req.get("bookingId").toString());
            if (reviewRepository.existsByBookingId(bookingId))
                throw new IllegalArgumentException("Already reviewed this session");
        } else {
            throw new IllegalArgumentException("Provide either bookingId or enrollmentId");
        }

        Instant windowExpires = null;
        if (enrollmentId != null) {
            var enrollment = batchEnrollmentRepository.findById(enrollmentId).orElseThrow();
            var anchor = enrollment.getCompletionDateUtc() != null
                    ? enrollment.getCompletionDateUtc() : enrollment.getEndDateUtc();
            windowExpires = anchor.plus(REVIEW_WINDOW_DAYS, ChronoUnit.DAYS);
        }

        var review = Review.builder()
                .id(UUID.randomUUID())
                .studentProfileId(student.getId())
                .tutorProfileId(tutorProfileId)
                .bookingId(bookingId)
                .batchEnrollmentId(enrollmentId)
                .reviewType(reviewType)
                .rating(rating)
                .comment(comment)
                .sentiment("NEUTRAL")
                .sentimentConfidence(0.5)
                .reviewWindowExpiresAtUtc(windowExpires)
                .createdAtUtc(Instant.now())
                .build();
        reviewRepository.save(review);

        var allReviews = reviewRepository.findByTutorProfileIdOrderByCreatedAtUtcDesc(tutorProfileId);
        double avg = allReviews.stream().mapToInt(Review::getRating).average().orElse(rating);
        jdbcTemplate.update(
                """
                UPDATE tutor_profiles
                SET "AverageRating" = ?, "ReviewCount" = ?, "UpdatedAtUtc" = NOW()
                WHERE "Id" = ?
                """,
                Math.round(avg * 10.0) / 10.0,
                allReviews.size(),
                tutorProfileId);

        String studentName = student.getUserAccount() != null
                ? student.getUserAccount().getFullName()
                : "A student";
        reviewPostProcessingService.processReviewAsync(
                review.getId(),
                studentAuthUserId,
                studentName,
                rating,
                comment);

        var result = new LinkedHashMap<String, Object>();
        result.put("id", review.getId());
        result.put("rating", review.getRating());
        result.put("comment", review.getComment());
        result.put("sentiment", review.getSentiment());
        result.put("sentimentConfidence", review.getSentimentConfidence());
        result.put("enrollmentId", review.getBatchEnrollmentId());
        result.put("bookingId", review.getBookingId());
        result.put("studentName", studentName);
        result.put("createdAtUtc", review.getCreatedAtUtc());
        result.put("processingStatus", "background");
        result.put("message", "Review saved. AI analysis and recommendations update in the background.");
        return result;
    }

    private void validateEnrollmentReview(UUID studentProfileId, UUID enrollmentId, UUID tutorProfileId) {
        if (reviewRepository.existsByBatchEnrollmentId(enrollmentId))
            throw new IllegalArgumentException("Already reviewed this course");

        var enrollment = batchEnrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new IllegalArgumentException("Enrollment not found"));

        if (!enrollment.getStudentProfileId().equals(studentProfileId))
            throw new IllegalArgumentException("This enrollment does not belong to you");
        if (!enrollment.getTutorProfileId().equals(tutorProfileId))
            throw new IllegalArgumentException("Tutor does not match this enrollment");

        int status = enrollment.getStatus();
        if (status != STATUS_COMPLETED && status != STATUS_EXPIRED && status != STATUS_WITHDRAWN)
            throw new IllegalArgumentException("Reviews are available after your course is completed, expires, or you withdraw");

        Instant anchor = enrollment.getCompletionDateUtc() != null
                ? enrollment.getCompletionDateUtc()
                : enrollment.getEndDateUtc();
        Instant windowEnd = anchor.plus(REVIEW_WINDOW_DAYS, ChronoUnit.DAYS);
        if (Instant.now().isAfter(windowEnd))
            throw new IllegalArgumentException("The 10-day review window has closed");
    }

    public List<Map<String, Object>> getTutorReviews(UUID tutorProfileId) {
        return jdbcTemplate.query(
                """
                SELECT r."Id", r."Rating", r."Comment", r."CreatedAtUtc",
                       r."BatchEnrollmentId", r."BookingId", r."ReviewType",
                       r."Sentiment", ua.full_name
                FROM reviews r
                JOIN student_profiles sp ON sp."Id" = r."StudentProfileId"
                JOIN user_accounts ua ON ua.id = sp."UserAccountId"
                WHERE r."TutorProfileId" = ?
                ORDER BY r."CreatedAtUtc" DESC
                """,
                (rs, rowNum) -> {
                    var m = new LinkedHashMap<String, Object>();
                    m.put("id", rs.getObject("Id", UUID.class));
                    m.put("rating", rs.getInt("Rating"));
                    m.put("comment", rs.getString("Comment"));
                    var created = rs.getTimestamp("CreatedAtUtc");
                    m.put("createdAtUtc", created != null ? created.toInstant().atOffset(ZoneOffset.UTC).toString() : null);
                    m.put("enrollmentId", rs.getObject("BatchEnrollmentId", UUID.class));
                    m.put("bookingId", rs.getObject("BookingId", UUID.class));
                    m.put("reviewType", rs.getInt("ReviewType"));
                    m.put("sentiment", rs.getString("Sentiment"));
                    m.put("verified", rs.getObject("BatchEnrollmentId") != null || rs.getObject("BookingId") != null);
                    m.put("studentName", maskStudentName(rs.getString("full_name")));
                    m.put("readOnly", true);
                    return m;
                },
                tutorProfileId);
    }

    static String maskStudentName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "Verified Student";
        String[] parts = fullName.trim().split("\\s+");
        if (parts.length == 1) {
            return maskToken(parts[0]);
        }
        return maskToken(parts[0]) + " " + parts[parts.length - 1].charAt(0) + ".";
    }

    private static String maskToken(String token) {
        if (token == null || token.isEmpty()) return "***";
        if (token.length() <= 2) return token.charAt(0) + "***";
        return token.charAt(0) + "***" + token.charAt(token.length() - 1);
    }
}
