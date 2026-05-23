package com.mentorhub.studentservice.service;

import com.mentorhub.studentservice.model.*;
import com.mentorhub.studentservice.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentOnboardingServiceTest {

    @Mock private StudentProfileRepository studentProfileRepository;
    @Mock private UserAccountRepository userAccountRepository;

    @InjectMocks private StudentOnboardingService studentOnboardingService;

    private UserAccount testUser;

    @BeforeEach
    void setUp() {
        testUser = new UserAccount();
        testUser.setId(UUID.randomUUID());
        testUser.setAuthUserId("auth-user-123");
        testUser.setFullName("Test Student");
        testUser.setEmail("student@test.com");
    }

    @Test
    void getStudentProfile_existingProfile_returnsMap() {
        StudentProfile profile = StudentProfile.builder()
                .id(UUID.randomUUID())
                .userAccountId(testUser.getId())
                .educationLevel("College")
                .subjectsCsv("Math,Science")
                .learningGoalsOrTargetGrade("Improve grades")
                .preferredTimeSlotsCsv("Morning,Evening")
                .createdAtUtc(Instant.now())
                .build();

        when(studentProfileRepository.findByAuthUserId("auth-user-123")).thenReturn(Optional.of(profile));
        when(userAccountRepository.findByAuthUserId("auth-user-123")).thenReturn(Optional.of(testUser));

        Map<String, Object> result = studentOnboardingService.getStudentProfile("auth-user-123");

        assertNotNull(result);
        assertEquals("Test Student", result.get("fullName"));
        assertEquals("College", result.get("educationLevel"));
        assertEquals(List.of("Math", "Science"), result.get("subjectsOfInterest"));
        assertEquals(List.of("Improve grades"), result.get("learningGoals"));
        assertEquals(List.of("Morning", "Evening"), result.get("preferredSchedule"));
    }

    @Test
    void getStudentProfile_notFound_returnsNull() {
        when(studentProfileRepository.findByAuthUserId("unknown")).thenReturn(Optional.empty());

        Map<String, Object> result = studentOnboardingService.getStudentProfile("unknown");

        assertNull(result);
    }

    @Test
    void upsertStudentProfile_createNew() {
        when(userAccountRepository.findByAuthUserId("auth-user-123")).thenReturn(Optional.of(testUser));
        when(studentProfileRepository.findByAuthUserId("auth-user-123")).thenReturn(Optional.empty());
        when(studentProfileRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(userAccountRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> request = new HashMap<>();
        request.put("fullName", "Updated Name");
        request.put("educationLevel", "University");
        request.put("subjectsOfInterest", List.of("Math", "Physics"));

        Map<String, Object> result = studentOnboardingService.upsertStudentProfile("auth-user-123", request);

        assertNotNull(result);
        assertEquals("Updated Name", result.get("fullName"));
        assertEquals("University", result.get("educationLevel"));
        verify(studentProfileRepository).save(any());
    }

    @Test
    void upsertStudentProfile_updateExisting() {
        StudentProfile existing = StudentProfile.builder()
                .id(UUID.randomUUID())
                .userAccountId(testUser.getId())
                .createdAtUtc(Instant.now())
                .build();

        when(userAccountRepository.findByAuthUserId("auth-user-123")).thenReturn(Optional.of(testUser));
        when(studentProfileRepository.findByAuthUserId("auth-user-123")).thenReturn(Optional.of(existing));
        when(studentProfileRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(userAccountRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> request = Map.of("fullName", "New Name");

        Map<String, Object> result = studentOnboardingService.upsertStudentProfile("auth-user-123", request);

        assertEquals("New Name", result.get("fullName"));
    }

    @Test
    void upsertStudentProfile_userNotFound_throws() {
        when(userAccountRepository.findByAuthUserId("unknown")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> studentOnboardingService.upsertStudentProfile("unknown", Map.of()));
    }

    @Test
    void upsertStudentProfile_handlesStringSubjects() {
        when(userAccountRepository.findByAuthUserId("auth-user-123")).thenReturn(Optional.of(testUser));
        when(studentProfileRepository.findByAuthUserId("auth-user-123")).thenReturn(Optional.empty());
        when(studentProfileRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> request = Map.of("subjectsOfInterest", "Math,Science");

        Map<String, Object> result = studentOnboardingService.upsertStudentProfile("auth-user-123", request);

        assertNotNull(result);
    }

    @Test
    void upsertStudentProfile_handlesProfilePhoto() {
        when(userAccountRepository.findByAuthUserId("auth-user-123")).thenReturn(Optional.of(testUser));
        when(studentProfileRepository.findByAuthUserId("auth-user-123")).thenReturn(Optional.empty());
        when(studentProfileRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> request = Map.of("profilePhotoUrl", "https://photo.jpg");

        Map<String, Object> result = studentOnboardingService.upsertStudentProfile("auth-user-123", request);

        assertEquals("https://photo.jpg", result.get("profilePhotoUrl"));
    }

    @Test
    void getStudentProfile_nullCsvFields_returnsEmptyLists() {
        StudentProfile profile = StudentProfile.builder()
                .id(UUID.randomUUID())
                .userAccountId(testUser.getId())
                .createdAtUtc(Instant.now())
                .build();

        when(studentProfileRepository.findByAuthUserId("auth-user-123")).thenReturn(Optional.of(profile));
        when(userAccountRepository.findByAuthUserId("auth-user-123")).thenReturn(Optional.of(testUser));

        Map<String, Object> result = studentOnboardingService.getStudentProfile("auth-user-123");

        assertEquals(List.of(), result.get("subjectsOfInterest"));
        assertEquals(List.of(), result.get("learningGoals"));
        assertEquals(List.of(), result.get("preferredSchedule"));
    }
}
