package com.mentorhub.tutorservice.service;

import com.mentorhub.tutorservice.model.*;
import com.mentorhub.tutorservice.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TutorOnboardingServiceTest {

    @Mock private TutorProfileRepository tutorProfileRepository;
    @Mock private UserAccountRepository userAccountRepository;
    @InjectMocks private TutorOnboardingService service;

    private UserAccount testUser;

    @BeforeEach
    void setUp() {
        testUser = new UserAccount();
        testUser.setId(UUID.randomUUID());
        testUser.setAuthUserId("auth-tutor-1");
        testUser.setFullName("Test Tutor");
        testUser.setEmail("tutor@test.com");
    }

    @Test
    void getTutorProfile_notFound_returnsNull() {
        when(tutorProfileRepository.findByAuthUserId("unknown")).thenReturn(Optional.empty());
        assertNull(service.getTutorProfile("unknown"));
    }

    @Test
    void upsertTutorProfile_createNew() {
        when(userAccountRepository.findByAuthUserId("auth-tutor-1")).thenReturn(Optional.of(testUser));
        when(tutorProfileRepository.findByAuthUserId("auth-tutor-1")).thenReturn(Optional.empty());
        when(tutorProfileRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> req = new HashMap<>();
        req.put("highestDegree", "MSc");
        req.put("yearsOfExperience", "3");
        req.put("bio", "New bio");
        req.put("hourlyFee", "45");
        req.put("subjects", List.of("English"));
        req.put("teachingMode", "BOTH");

        Map<String, Object> result = service.upsertTutorProfile("auth-tutor-1", req);
        assertNotNull(result);
        assertEquals("Pending", result.get("verificationStatus"));
        assertEquals("Both", result.get("teachingMode"));
    }

    @Test
    void upsertTutorProfile_approvedProfile_throws() {
        TutorProfile approved = TutorProfile.builder()
                .id(UUID.randomUUID()).userAccountId(testUser.getId())
                .verificationStatus(TutorVerificationStatuses.APPROVED).createdAtUtc(Instant.now()).build();
        when(userAccountRepository.findByAuthUserId("auth-tutor-1")).thenReturn(Optional.of(testUser));
        when(tutorProfileRepository.findByAuthUserId("auth-tutor-1")).thenReturn(Optional.of(approved));

        assertThrows(IllegalArgumentException.class,
                () -> service.upsertTutorProfile("auth-tutor-1", Map.of("bio", "new")));
    }

    @Test
    void upsertTutorProfile_rejectedProfile_allowsEditing() {
        TutorProfile rejected = TutorProfile.builder()
                .id(UUID.randomUUID()).userAccountId(testUser.getId())
                .verificationStatus(TutorVerificationStatuses.REJECTED).createdAtUtc(Instant.now()).build();
        when(userAccountRepository.findByAuthUserId("auth-tutor-1")).thenReturn(Optional.of(testUser));
        when(tutorProfileRepository.findByAuthUserId("auth-tutor-1")).thenReturn(Optional.of(rejected));
        when(tutorProfileRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> result = service.upsertTutorProfile("auth-tutor-1", Map.of("bio", "Updated"));
        assertEquals("Pending", result.get("verificationStatus"));
    }

    @Test
    void upsertTutorProfile_calculatesCompleteness() {
        when(userAccountRepository.findByAuthUserId("auth-tutor-1")).thenReturn(Optional.of(testUser));
        when(tutorProfileRepository.findByAuthUserId("auth-tutor-1")).thenReturn(Optional.empty());
        when(tutorProfileRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> req = new HashMap<>();
        req.put("highestDegree", "BSc");
        req.put("yearsOfExperience", "2");
        req.put("subjects", List.of("Math"));
        req.put("bio", "My bio");
        req.put("teachingMethodology", "Direct");
        req.put("hourlyFee", "30");
        req.put("profilePhotoUrl", "http://p.jpg");

        Map<String, Object> result = service.upsertTutorProfile("auth-tutor-1", req);
        assertEquals(85, result.get("profileCompleteness"));
    }

    @Test
    void upsertTutorProfile_userNotFound_throws() {
        when(userAccountRepository.findByAuthUserId("unknown")).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class,
                () -> service.upsertTutorProfile("unknown", Map.of()));
    }
}
