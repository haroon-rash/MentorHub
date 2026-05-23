package com.mentorhub.tutorservice.service;

import com.mentorhub.tutorservice.model.ApprovedTutor;
import com.mentorhub.tutorservice.model.TutorProfile;
import com.mentorhub.tutorservice.model.TutorVerificationStatuses;
import com.mentorhub.tutorservice.repository.ApprovedTutorRepository;
import com.mentorhub.tutorservice.repository.TutorProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class TutorCatalogService {

    private final ApprovedTutorRepository approvedTutorRepository;
    private final TutorProfileRepository tutorProfileRepository;

    public List<Map<String, Object>> getApprovedTutors() {
        var fromCatalog = approvedTutorRepository.findAll().stream()
                .filter(t -> "Approved".equalsIgnoreCase(t.getStatus()))
                .map(this::mapApproved)
                .toList();
        if (!fromCatalog.isEmpty()) {
            return fromCatalog;
        }

        return tutorProfileRepository.findByVerificationStatus(TutorVerificationStatuses.APPROVED).stream()
                .map(this::mapProfileAsApproved)
                .toList();
    }

    public Map<String, Object> getApprovedTutorById(UUID tutorProfileId) {
        var tutor = approvedTutorRepository.findByTutorProfileId(tutorProfileId)
                .orElseThrow(() -> new IllegalArgumentException("Approved tutor not found"));
        return mapApproved(tutor);
    }

    public Map<String, Object> getTutorPublicProfile(UUID id) {
        var tp = tutorProfileRepository.findByIdWithUser(id)
                .orElseThrow(() -> new IllegalArgumentException("Tutor not found"));
        var map = new LinkedHashMap<String, Object>();
        map.put("id", tp.getId());
        map.put("fullName", tp.getUserAccount() != null ? tp.getUserAccount().getFullName() : null);
        map.put("email", tp.getUserAccount() != null ? tp.getUserAccount().getEmail() : null);
        map.put("highestDegree", tp.getHighestDegree());
        map.put("yearsOfExperience", tp.getYearsOfExperience());
        map.put("subjects", tp.getSubjectsCsv() != null ? Arrays.asList(tp.getSubjectsCsv().split(",")) : List.of());
        map.put("bio", tp.getBio());
        map.put("teachingMethodology", tp.getTeachingMethodology());
        map.put("hourlyFee", tp.getHourlyFee());
        map.put("teachingMode", switch (tp.getTeachingMode()) { case 0 -> "Online"; case 1 -> "InPerson"; case 2 -> "Both"; default -> "Online"; });
        map.put("inPersonLocation", tp.getInPersonLocation());
        map.put("profilePhotoUrl", tp.getProfilePhotoUrl());
        map.put("verificationStatus", TutorVerificationStatuses.toApiString(tp.getVerificationStatus()));
        map.put("averageRating", tp.getAverageRating());
        map.put("reviewCount", tp.getReviewCount());
        map.put("availableDays", tp.getAvailableDaysCsv() != null
                ? Arrays.asList(tp.getAvailableDaysCsv().split(",")) : List.of());
        map.put("availableTimeSlots", tp.getAvailableTimeSlotsCsv() != null
                ? Arrays.asList(tp.getAvailableTimeSlotsCsv().split(",")) : List.of());
        map.put("gradeLevels", tp.getGradeLevelsCsv() != null
                ? Arrays.asList(tp.getGradeLevelsCsv().split(",")) : List.of());
        map.put("languages", tp.getLanguagesCsv() != null
                ? Arrays.asList(tp.getLanguagesCsv().split(",")) : List.of());
        map.put("profileCompleteness", tp.getProfileCompleteness());
        map.put("isVerified", tp.getVerificationStatus() != null
                && tp.getVerificationStatus() == TutorVerificationStatuses.APPROVED);
        return map;
    }

    public List<Map<String, Object>> searchTutors(String subject, BigDecimal minFee, BigDecimal maxFee, String teachingMode, String location, String search) {
        return approvedTutorRepository.findAll().stream()
                .filter(t -> "Approved".equalsIgnoreCase(t.getStatus()))
                .filter(t -> subject == null || (t.getSubjectsCsv() != null && t.getSubjectsCsv().toLowerCase().contains(subject.toLowerCase())))
                .filter(t -> minFee == null || (t.getHourlyFee() != null && t.getHourlyFee().compareTo(minFee) >= 0))
                .filter(t -> maxFee == null || (t.getHourlyFee() != null && t.getHourlyFee().compareTo(maxFee) <= 0))
                .filter(t -> teachingMode == null || (t.getTeachingMode() != null && t.getTeachingMode().equalsIgnoreCase(teachingMode)))
                .filter(t -> location == null || (t.getInPersonLocation() != null && t.getInPersonLocation().toLowerCase().contains(location.toLowerCase())))
                .filter(t -> search == null || (t.getFullName() != null && t.getFullName().toLowerCase().contains(search.toLowerCase())) || (t.getSubjectsCsv() != null && t.getSubjectsCsv().toLowerCase().contains(search.toLowerCase())))
                .map(this::mapApproved).toList();
    }

    @Transactional
    public void syncCatalog(Map<String, Object> data) {
        UUID tutorProfileId = UUID.fromString(data.get("tutorProfileId").toString());
        String status = (String) data.get("status");

        var existing = approvedTutorRepository.findByTutorProfileId(tutorProfileId).orElse(null);

        if ("Rejected".equalsIgnoreCase(status) || "REJECTED".equalsIgnoreCase(status)) {
            if (existing != null) approvedTutorRepository.delete(existing);
            return;
        }

        if (existing == null) {
            existing = ApprovedTutor.builder().id(UUID.randomUUID()).tutorProfileId(tutorProfileId).build();
        }

        existing.setAuthUserId((String) data.get("authUserId"));
        existing.setFullName((String) data.get("fullName"));
        existing.setEmail((String) data.get("email"));
        existing.setStatus(status);
        existing.setProfilePhotoUrl((String) data.get("profilePhotoUrl"));
        existing.setHighestDegree((String) data.get("highestDegree"));
        existing.setYearsOfExperience(data.get("yearsOfExperience") != null ? Integer.parseInt(data.get("yearsOfExperience").toString()) : 0);
        existing.setHourlyFee(data.get("hourlyFee") != null ? new BigDecimal(data.get("hourlyFee").toString()) : BigDecimal.ZERO);
        existing.setSubjectsCsv((String) data.get("subjectsCsv"));
        existing.setBio((String) data.get("bio"));
        existing.setTeachingMethodology((String) data.get("teachingMethodology"));
        existing.setTeachingMode((String) data.get("teachingMode"));
        existing.setInPersonLocation((String) data.get("inPersonLocation"));
        existing.setSyncedAtUtc(Instant.now());

        approvedTutorRepository.save(existing);
    }

    @Transactional
    public void updateRating(UUID tutorProfileId, BigDecimal averageRating, int reviewCount) {
        var approved = approvedTutorRepository.findByTutorProfileId(tutorProfileId).orElse(null);
        if (approved != null) {
            approved.setAverageRating(averageRating);
            approved.setReviewCount(reviewCount);
            approvedTutorRepository.save(approved);
        }

        var profile = tutorProfileRepository.findById(tutorProfileId).orElse(null);
        if (profile != null) {
            profile.setAverageRating(averageRating != null ? averageRating.doubleValue() : null);
            profile.setReviewCount(reviewCount);
            tutorProfileRepository.save(profile);
        }
    }

    private Map<String, Object> mapApproved(ApprovedTutor t) {
        var map = new LinkedHashMap<String, Object>();
        map.put("tutorProfileId", t.getTutorProfileId());
        map.put("authUserId", t.getAuthUserId());
        map.put("fullName", t.getFullName());
        map.put("email", t.getEmail());
        map.put("status", t.getStatus());
        map.put("profilePhotoUrl", t.getProfilePhotoUrl());
        map.put("highestDegree", t.getHighestDegree());
        map.put("yearsOfExperience", t.getYearsOfExperience());
        map.put("hourlyFee", t.getHourlyFee());
        map.put("subjects", t.getSubjectsCsv() != null ? Arrays.asList(t.getSubjectsCsv().split(",")) : List.of());
        map.put("bio", t.getBio());
        map.put("teachingMethodology", t.getTeachingMethodology());
        map.put("teachingMode", t.getTeachingMode());
        map.put("inPersonLocation", t.getInPersonLocation());
        map.put("averageRating", t.getAverageRating());
        map.put("reviewCount", t.getReviewCount());
        return map;
    }

    private Map<String, Object> mapProfileAsApproved(TutorProfile tp) {
        var map = new LinkedHashMap<String, Object>();
        map.put("tutorProfileId", tp.getId());
        map.put("authUserId", tp.getUserAccount() != null ? tp.getUserAccount().getAuthUserId() : null);
        map.put("fullName", tp.getUserAccount() != null ? tp.getUserAccount().getFullName() : null);
        map.put("email", tp.getUserAccount() != null ? tp.getUserAccount().getEmail() : null);
        map.put("status", "Approved");
        map.put("profilePhotoUrl", tp.getProfilePhotoUrl());
        map.put("highestDegree", tp.getHighestDegree());
        map.put("yearsOfExperience", tp.getYearsOfExperience());
        map.put("hourlyFee", tp.getHourlyFee());
        map.put("subjects", tp.getSubjectsCsv() != null ? Arrays.asList(tp.getSubjectsCsv().split(",")) : List.of());
        map.put("bio", tp.getBio());
        map.put("teachingMethodology", tp.getTeachingMethodology());
        map.put("teachingMode", switch (tp.getTeachingMode() != null ? tp.getTeachingMode() : 0) {
            case 1 -> "InPerson";
            case 2 -> "Both";
            default -> "Online";
        });
        map.put("inPersonLocation", tp.getInPersonLocation());
        map.put("averageRating", tp.getAverageRating());
        map.put("reviewCount", tp.getReviewCount());
        return map;
    }
}
