package com.mentorhub.studentservice.service;

import com.mentorhub.studentservice.model.*;
import com.mentorhub.studentservice.repository.*;
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
class StudentProgressServiceTest {

    @Mock private StudentProfileRepository studentProfileRepository;
    @Mock private LearningGoalRepository learningGoalRepository;
    @Mock private AssessmentRecordRepository assessmentRecordRepository;
    @Mock private SessionNoteRepository sessionNoteRepository;

    @InjectMocks private StudentProgressService studentProgressService;

    private StudentProfile testProfile;

    @BeforeEach
    void setUp() {
        testProfile = new StudentProfile();
        testProfile.setId(UUID.randomUUID());
        testProfile.setUserAccountId(UUID.randomUUID());
    }

    @Test
    void getProgress_returnsGoalsAssessmentsAndNotes() {
        String authUserId = "user-123";
        when(studentProfileRepository.findByAuthUserId(authUserId)).thenReturn(Optional.of(testProfile));
        when(learningGoalRepository.findByStudentProfileIdOrderByCreatedAtUtcDesc(testProfile.getId()))
                .thenReturn(List.of());
        when(assessmentRecordRepository.findByStudentProfileIdOrderByDateRecordedDesc(testProfile.getId()))
                .thenReturn(List.of());
        when(sessionNoteRepository.findByStudentProfileIdOrderByCreatedAtUtcDesc(testProfile.getId()))
                .thenReturn(List.of());

        Map<String, Object> progress = studentProgressService.getProgress(authUserId);

        assertNotNull(progress);
        assertTrue(progress.containsKey("goals"));
        assertTrue(progress.containsKey("assessments"));
        assertTrue(progress.containsKey("sessionNotes"));
    }

    @Test
    void getProgress_userNotFound_throwsException() {
        when(studentProfileRepository.findByAuthUserId("unknown")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> studentProgressService.getProgress("unknown"));
    }

    @Test
    void addGoal_createsGoalWithCorrectFields() {
        String authUserId = "user-123";
        when(studentProfileRepository.findByAuthUserId(authUserId)).thenReturn(Optional.of(testProfile));
        when(learningGoalRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> request = Map.of(
                "title", "Learn Calculus",
                "description", "Master derivatives and integrals"
        );

        Map<String, Object> result = studentProgressService.addGoal(authUserId, request);

        assertNotNull(result);
        assertEquals("Learn Calculus", result.get("title"));
        assertEquals("Master derivatives and integrals", result.get("description"));
        assertEquals("Not Started", result.get("status"));
    }

    @Test
    void addGoal_withTargetDate() {
        String authUserId = "user-123";
        when(studentProfileRepository.findByAuthUserId(authUserId)).thenReturn(Optional.of(testProfile));
        when(learningGoalRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> request = new HashMap<>();
        request.put("title", "Test Goal");
        request.put("description", "Test");
        request.put("targetDate", "2026-06-01T00:00:00Z");

        Map<String, Object> result = studentProgressService.addGoal(authUserId, request);

        assertNotNull(result.get("targetDate"));
    }

    @Test
    void updateGoalStatus_updatesCorrectly() {
        String authUserId = "user-123";
        UUID goalId = UUID.randomUUID();
        LearningGoal existingGoal = LearningGoal.builder()
                .id(goalId).studentProfileId(testProfile.getId())
                .title("Test").status("Not Started").build();

        when(studentProfileRepository.findByAuthUserId(authUserId)).thenReturn(Optional.of(testProfile));
        when(learningGoalRepository.findById(goalId)).thenReturn(Optional.of(existingGoal));
        when(learningGoalRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> result = studentProgressService.updateGoalStatus(authUserId, goalId, "In Progress");

        assertEquals("In Progress", result.get("status"));
    }

    @Test
    void updateGoalStatus_wrongStudent_throwsException() {
        String authUserId = "user-123";
        UUID goalId = UUID.randomUUID();
        LearningGoal goal = LearningGoal.builder()
                .id(goalId).studentProfileId(UUID.randomUUID()) // Different student
                .title("Test").status("Not Started").build();

        when(studentProfileRepository.findByAuthUserId(authUserId)).thenReturn(Optional.of(testProfile));
        when(learningGoalRepository.findById(goalId)).thenReturn(Optional.of(goal));

        assertThrows(IllegalArgumentException.class,
                () -> studentProgressService.updateGoalStatus(authUserId, goalId, "Done"));
    }

    @Test
    void addAssessment_createsRecordCorrectly() {
        String authUserId = "user-123";
        when(studentProfileRepository.findByAuthUserId(authUserId)).thenReturn(Optional.of(testProfile));
        when(assessmentRecordRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> request = new HashMap<>();
        request.put("title", "Calculus Midterm");
        request.put("subject", "Mathematics");
        request.put("scoreObtained", "85");
        request.put("totalScore", "100");
        request.put("topicTag", "Derivatives");

        Map<String, Object> result = studentProgressService.addAssessment(authUserId, request);

        assertEquals("Calculus Midterm", result.get("title"));
        assertEquals("Mathematics", result.get("subject"));
        assertEquals(new BigDecimal("85"), result.get("scoreObtained"));
        assertEquals(new BigDecimal("100"), result.get("totalScore"));
        assertEquals(85.0, ((Number) result.get("scorePercentage")).doubleValue());
    }

    @Test
    void addSessionNote_createsNoteCorrectly() {
        String authUserId = "user-123";
        UUID bookingId = UUID.randomUUID();
        UUID tutorId = UUID.randomUUID();
        when(studentProfileRepository.findByAuthUserId(authUserId)).thenReturn(Optional.of(testProfile));
        when(sessionNoteRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> request = new HashMap<>();
        request.put("bookingId", bookingId.toString());
        request.put("tutorProfileId", tutorId.toString());
        request.put("topicsCovered", "Integration techniques");
        request.put("remarks", "Good progress");

        Map<String, Object> result = studentProgressService.addSessionNote(authUserId, request);

        assertEquals("Integration techniques", result.get("topicsCovered"));
        assertEquals("Good progress", result.get("remarks"));
        assertEquals(bookingId, result.get("bookingId"));
    }
}
