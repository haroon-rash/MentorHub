package com.mentorhub.reviewratingservice.service;

import com.mentorhub.reviewratingservice.model.*;
import com.mentorhub.reviewratingservice.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock private ReviewRepository reviewRepository;
    @Mock private StudentProfileRepository studentProfileRepository;
    @Mock private RestTemplate restTemplate;

    @InjectMocks private ReviewService reviewService;

    private StudentProfile student;
    private UserAccount studentUser;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(reviewService, "aiUrl", "http://localhost:8093");
        ReflectionTestUtils.setField(reviewService, "tutorUrl", "http://localhost:8087");
        ReflectionTestUtils.setField(reviewService, "notifUrl", "http://localhost:8091");

        studentUser = new UserAccount();
        studentUser.setAuthUserId("student-auth-1");
        studentUser.setFullName("Test Student");

        student = new StudentProfile();
        student.setId(UUID.randomUUID());
        student.setUserAccount(studentUser);
    }

    @Test
    void createReview_success() {
        UUID tutorId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();

        when(studentProfileRepository.findByAuthUserId("student-auth-1")).thenReturn(Optional.of(student));
        when(reviewRepository.existsByBookingId(bookingId)).thenReturn(false);
        when(reviewRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(reviewRepository.findByTutorProfileIdOrderByCreatedAtUtcDesc(tutorId)).thenReturn(List.of());

        Map<String, Object> req = new HashMap<>();
        req.put("rating", "4");
        req.put("tutorProfileId", tutorId.toString());
        req.put("bookingId", bookingId.toString());
        req.put("comment", "Great session!");

        Map<String, Object> result = reviewService.createReview("student-auth-1", req);

        assertNotNull(result);
        assertEquals(4, result.get("rating"));
        assertEquals("Great session!", result.get("comment"));
        assertEquals("Test Student", result.get("studentName"));
    }

    @Test
    void createReview_invalidRating_throws() {
        Map<String, Object> req = new HashMap<>();
        req.put("rating", "0");
        req.put("tutorProfileId", UUID.randomUUID().toString());
        req.put("bookingId", UUID.randomUUID().toString());

        assertThrows(IllegalArgumentException.class,
                () -> reviewService.createReview("student-auth-1", req));
    }

    @Test
    void createReview_ratingTooHigh_throws() {
        Map<String, Object> req = new HashMap<>();
        req.put("rating", "6");
        req.put("tutorProfileId", UUID.randomUUID().toString());
        req.put("bookingId", UUID.randomUUID().toString());

        assertThrows(IllegalArgumentException.class,
                () -> reviewService.createReview("student-auth-1", req));
    }

    @Test
    void createReview_duplicateBooking_throws() {
        UUID bookingId = UUID.randomUUID();
        when(studentProfileRepository.findByAuthUserId("student-auth-1")).thenReturn(Optional.of(student));
        when(reviewRepository.existsByBookingId(bookingId)).thenReturn(true);

        Map<String, Object> req = new HashMap<>();
        req.put("rating", "5");
        req.put("tutorProfileId", UUID.randomUUID().toString());
        req.put("bookingId", bookingId.toString());

        assertThrows(IllegalArgumentException.class,
                () -> reviewService.createReview("student-auth-1", req));
    }

    @Test
    void createReview_studentNotFound_throws() {
        when(studentProfileRepository.findByAuthUserId("unknown")).thenReturn(Optional.empty());

        Map<String, Object> req = new HashMap<>();
        req.put("rating", "5");
        req.put("tutorProfileId", UUID.randomUUID().toString());
        req.put("bookingId", UUID.randomUUID().toString());

        assertThrows(IllegalArgumentException.class,
                () -> reviewService.createReview("unknown", req));
    }

    @Test
    void getTutorReviews_returnsAllReviews() {
        UUID tutorId = UUID.randomUUID();
        Review r1 = Review.builder().id(UUID.randomUUID()).rating(5)
                .comment("Excellent").sentiment("POSITIVE")
                .sentimentConfidence(0.9).bookingId(UUID.randomUUID())
                .createdAtUtc(Instant.now()).build();
        Review r2 = Review.builder().id(UUID.randomUUID()).rating(3)
                .comment("OK").sentiment("NEUTRAL")
                .sentimentConfidence(0.6).bookingId(UUID.randomUUID())
                .createdAtUtc(Instant.now()).build();

        when(reviewRepository.findByTutorProfileIdOrderByCreatedAtUtcDesc(tutorId))
                .thenReturn(List.of(r1, r2));

        List<Map<String, Object>> results = reviewService.getTutorReviews(tutorId);

        assertEquals(2, results.size());
        assertEquals(5, results.get(0).get("rating"));
        assertEquals(3, results.get(1).get("rating"));
    }

    @Test
    void getTutorReviews_empty() {
        UUID tutorId = UUID.randomUUID();
        when(reviewRepository.findByTutorProfileIdOrderByCreatedAtUtcDesc(tutorId))
                .thenReturn(List.of());

        List<Map<String, Object>> results = reviewService.getTutorReviews(tutorId);

        assertTrue(results.isEmpty());
    }
}
