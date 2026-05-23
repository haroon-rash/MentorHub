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
class TutorCatalogServiceTest {

    @Mock private ApprovedTutorRepository approvedTutorRepository;
    @Mock private TutorProfileRepository tutorProfileRepository;

    @InjectMocks private TutorCatalogService tutorCatalogService;

    private ApprovedTutor testApprovedTutor;

    @BeforeEach
    void setUp() {
        testApprovedTutor = ApprovedTutor.builder()
                .id(UUID.randomUUID())
                .tutorProfileId(UUID.randomUUID())
                .authUserId("auth-tutor-1")
                .fullName("John Smith")
                .email("john@test.com")
                .status("Approved")
                .highestDegree("PhD")
                .yearsOfExperience(10)
                .hourlyFee(BigDecimal.valueOf(75))
                .subjectsCsv("Math,Physics,Chemistry")
                .bio("Expert tutor")
                .teachingMethodology("Interactive")
                .teachingMode("Online")
                .inPersonLocation(null)
                .averageRating(BigDecimal.valueOf(4.5))
                .reviewCount(20)
                .syncedAtUtc(Instant.now())
                .build();
    }

    @Test
    void getApprovedTutors_filtersApprovedOnly() {
        ApprovedTutor rejected = ApprovedTutor.builder()
                .id(UUID.randomUUID()).status("Rejected").build();

        when(approvedTutorRepository.findAll()).thenReturn(List.of(testApprovedTutor, rejected));

        List<Map<String, Object>> result = tutorCatalogService.getApprovedTutors();

        assertEquals(1, result.size());
        assertEquals("John Smith", result.get(0).get("fullName"));
    }

    @Test
    void getApprovedTutors_emptyList() {
        when(approvedTutorRepository.findAll()).thenReturn(List.of());

        List<Map<String, Object>> result = tutorCatalogService.getApprovedTutors();

        assertTrue(result.isEmpty());
    }

    @Test
    void getApprovedTutorById_found() {
        UUID id = testApprovedTutor.getTutorProfileId();
        when(approvedTutorRepository.findByTutorProfileId(id))
                .thenReturn(Optional.of(testApprovedTutor));

        Map<String, Object> result = tutorCatalogService.getApprovedTutorById(id);

        assertEquals("John Smith", result.get("fullName"));
        assertEquals(BigDecimal.valueOf(75), result.get("hourlyFee"));
        assertEquals(List.of("Math", "Physics", "Chemistry"), result.get("subjects"));
    }

    @Test
    void getApprovedTutorById_notFound_throws() {
        UUID fakeId = UUID.randomUUID();
        when(approvedTutorRepository.findByTutorProfileId(fakeId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> tutorCatalogService.getApprovedTutorById(fakeId));
    }

    @Test
    void searchTutors_bySubject() {
        when(approvedTutorRepository.findAll()).thenReturn(List.of(testApprovedTutor));

        List<Map<String, Object>> result = tutorCatalogService.searchTutors("Math", null, null, null, null, null);

        assertEquals(1, result.size());
    }

    @Test
    void searchTutors_bySubject_noMatch() {
        when(approvedTutorRepository.findAll()).thenReturn(List.of(testApprovedTutor));

        List<Map<String, Object>> result = tutorCatalogService.searchTutors("Biology", null, null, null, null, null);

        assertTrue(result.isEmpty());
    }

    @Test
    void searchTutors_byFeeRange() {
        when(approvedTutorRepository.findAll()).thenReturn(List.of(testApprovedTutor));

        // Within range
        List<Map<String, Object>> result = tutorCatalogService.searchTutors(
                null, BigDecimal.valueOf(50), BigDecimal.valueOf(100), null, null, null);
        assertEquals(1, result.size());

        // Below range
        result = tutorCatalogService.searchTutors(
                null, BigDecimal.valueOf(100), BigDecimal.valueOf(200), null, null, null);
        assertTrue(result.isEmpty());
    }

    @Test
    void searchTutors_byTeachingMode() {
        when(approvedTutorRepository.findAll()).thenReturn(List.of(testApprovedTutor));

        List<Map<String, Object>> result = tutorCatalogService.searchTutors(null, null, null, "Online", null, null);
        assertEquals(1, result.size());

        result = tutorCatalogService.searchTutors(null, null, null, "InPerson", null, null);
        assertTrue(result.isEmpty());
    }

    @Test
    void searchTutors_bySearchText() {
        when(approvedTutorRepository.findAll()).thenReturn(List.of(testApprovedTutor));

        List<Map<String, Object>> result = tutorCatalogService.searchTutors(null, null, null, null, null, "John");
        assertEquals(1, result.size());

        result = tutorCatalogService.searchTutors(null, null, null, null, null, "Unknown");
        assertTrue(result.isEmpty());
    }

    @Test
    void syncCatalog_createsNewApprovedTutor() {
        UUID tutorId = UUID.randomUUID();
        when(approvedTutorRepository.findByTutorProfileId(tutorId)).thenReturn(Optional.empty());
        when(approvedTutorRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> data = new HashMap<>();
        data.put("tutorProfileId", tutorId.toString());
        data.put("authUserId", "auth-1");
        data.put("fullName", "New Tutor");
        data.put("email", "new@test.com");
        data.put("status", "Approved");
        data.put("hourlyFee", "60");
        data.put("yearsOfExperience", "3");

        tutorCatalogService.syncCatalog(data);

        verify(approvedTutorRepository).save(argThat(at ->
                "New Tutor".equals(at.getFullName()) && "Approved".equals(at.getStatus())));
    }

    @Test
    void syncCatalog_rejectedStatus_deletesExisting() {
        UUID tutorId = UUID.randomUUID();
        when(approvedTutorRepository.findByTutorProfileId(tutorId))
                .thenReturn(Optional.of(testApprovedTutor));

        Map<String, Object> data = new HashMap<>();
        data.put("tutorProfileId", tutorId.toString());
        data.put("status", "Rejected");

        tutorCatalogService.syncCatalog(data);

        verify(approvedTutorRepository).delete(testApprovedTutor);
    }

    @Test
    void updateRating_updatesApprovedAndProfile() {
        UUID tutorId = testApprovedTutor.getTutorProfileId();
        TutorProfile profile = new TutorProfile();
        profile.setId(tutorId);

        when(approvedTutorRepository.findByTutorProfileId(tutorId))
                .thenReturn(Optional.of(testApprovedTutor));
        when(tutorProfileRepository.findById(tutorId)).thenReturn(Optional.of(profile));
        when(approvedTutorRepository.save(any())).thenReturn(testApprovedTutor);
        when(tutorProfileRepository.save(any())).thenReturn(profile);

        tutorCatalogService.updateRating(tutorId, BigDecimal.valueOf(4.8), 25);

        verify(approvedTutorRepository).save(argThat(at ->
                at.getAverageRating().equals(BigDecimal.valueOf(4.8)) && at.getReviewCount() == 25));
        verify(tutorProfileRepository).save(argThat(tp ->
                tp.getAverageRating().equals(BigDecimal.valueOf(4.8)) && tp.getReviewCount() == 25));
    }
}
