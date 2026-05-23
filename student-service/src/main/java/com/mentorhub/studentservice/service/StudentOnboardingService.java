package com.mentorhub.studentservice.service;

import com.mentorhub.studentservice.model.*;
import com.mentorhub.studentservice.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class StudentOnboardingService {

    private final StudentProfileRepository studentProfileRepository;
    private final UserAccountRepository userAccountRepository;

    public Map<String, Object> getStudentProfile(String authUserId) {
        var profile = studentProfileRepository.findByAuthUserId(authUserId).orElse(null);
        if (profile == null) return null;
        var user = userAccountRepository.findByAuthUserId(authUserId).orElse(null);
        return mapProfile(profile, authUserId, user);
    }

    @Transactional
    public Map<String, Object> upsertStudentProfile(String authUserId, Map<String, Object> request) {
        var userAccount = userAccountRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new IllegalArgumentException("User account not found. Please sign up first."));

        if (request.containsKey("fullName") && request.get("fullName") != null) {
            userAccount.setFullName(request.get("fullName").toString());
            userAccountRepository.save(userAccount);
        }

        var profile = studentProfileRepository.findByAuthUserId(authUserId).orElse(null);

        if (profile == null) {
            profile = StudentProfile.builder()
                    .id(UUID.randomUUID())
                    .userAccountId(userAccount.getId())
                    .preferredMode("Online")
                    .preferredLanguageOfInstruction("English")
                    .createdAtUtc(Instant.now())
                    .build();
        }

        if (request.containsKey("profilePhotoUrl")) profile.setProfilePhotoUrl(stringOrNull(request.get("profilePhotoUrl")));
        if (request.containsKey("dateOfBirth") && request.get("dateOfBirth") != null) {
            profile.setDateOfBirth(Instant.parse(request.get("dateOfBirth").toString()));
        }
        if (request.containsKey("gender")) profile.setGender(stringOrNull(request.get("gender")));
        if (request.containsKey("cityOrArea")) profile.setCityOrArea(stringOrNull(request.get("cityOrArea")));
        if (request.containsKey("educationLevel")) profile.setEducationLevel(stringOrNull(request.get("educationLevel")));
        if (request.containsKey("currentGradeOrYear")) profile.setCurrentGradeOrYear(stringOrNull(request.get("currentGradeOrYear")));
        if (request.containsKey("schoolOrInstitutionName")) profile.setSchoolOrInstitutionName(stringOrNull(request.get("schoolOrInstitutionName")));
        if (request.containsKey("mediumOfEducation")) profile.setMediumOfEducation(stringOrNull(request.get("mediumOfEducation")));
        if (request.containsKey("topicsOfDifficulty")) profile.setTopicsOfDifficulty(stringOrNull(request.get("topicsOfDifficulty")));
        if (request.containsKey("tutoringPurpose")) profile.setTutoringPurpose(stringOrNull(request.get("tutoringPurpose")));
        if (request.containsKey("learningGoalsOrTargetGrade")) profile.setLearningGoalsOrTargetGrade(stringOrNull(request.get("learningGoalsOrTargetGrade")));
        if (request.containsKey("preferredMode")) profile.setPreferredMode(stringOrNull(request.get("preferredMode")));
        if (request.containsKey("preferredTutorGender")) profile.setPreferredTutorGender(stringOrNull(request.get("preferredTutorGender")));
        if (request.containsKey("preferredLanguageOfInstruction")) profile.setPreferredLanguageOfInstruction(stringOrNull(request.get("preferredLanguageOfInstruction")));

        if (request.containsKey("subjects") || request.containsKey("subjectsOfInterest")) {
            profile.setSubjectsCsv(joinList(request.get("subjects") != null ? request.get("subjects") : request.get("subjectsOfInterest")));
        }
        if (request.containsKey("preferredDays")) {
            profile.setPreferredDaysCsv(joinList(request.get("preferredDays")));
        }
        if (request.containsKey("preferredTimeSlots")) {
            profile.setPreferredTimeSlotsCsv(joinList(request.get("preferredTimeSlots")));
        }
        if (request.containsKey("preferredSchedule")) {
            profile.setPreferredTimeSlotsCsv(joinList(request.get("preferredSchedule")));
        }
        if (request.containsKey("learningGoals")) {
            profile.setLearningGoalsOrTargetGrade(joinList(request.get("learningGoals")));
        }

        if (request.containsKey("budgetPerSession") && request.get("budgetPerSession") != null) {
            profile.setBudgetPerSession(new BigDecimal(request.get("budgetPerSession").toString()));
        }
        if (request.containsKey("budgetPerMonth") && request.get("budgetPerMonth") != null) {
            profile.setBudgetPerMonth(new BigDecimal(request.get("budgetPerMonth").toString()));
        }

        if (request.containsKey("guardianFullName")) profile.setGuardianFullName(stringOrNull(request.get("guardianFullName")));
        if (request.containsKey("guardianContactNumber")) profile.setGuardianContactNumber(stringOrNull(request.get("guardianContactNumber")));
        if (request.containsKey("guardianEmailAddress")) profile.setGuardianEmailAddress(stringOrNull(request.get("guardianEmailAddress")));
        if (request.containsKey("guardianRelationship")) profile.setGuardianRelationship(stringOrNull(request.get("guardianRelationship")));
        if (request.containsKey("guardianConsentAcknowledgment")) profile.setGuardianConsentAcknowledgment((Boolean) request.get("guardianConsentAcknowledgment"));
        if (request.containsKey("termsAccepted")) profile.setTermsAccepted((Boolean) request.get("termsAccepted"));
        if (request.containsKey("privacyAccepted")) profile.setPrivacyAccepted((Boolean) request.get("privacyAccepted"));

        profile.setProfileCompleteness(calculateCompleteness(profile));
        profile.setUpdatedAtUtc(Instant.now());
        studentProfileRepository.save(profile);

        return mapProfile(profile, authUserId, userAccount);
    }

    private int calculateCompleteness(StudentProfile p) {
        int score = 0;
        if (p.getProfilePhotoUrl() != null && !p.getProfilePhotoUrl().isBlank()) score += 10;
        if (p.getDateOfBirth() != null) score += 10;
        if (p.getCityOrArea() != null && !p.getCityOrArea().isBlank()) score += 10;
        if (p.getEducationLevel() != null && !p.getEducationLevel().isBlank()) score += 10;
        if (p.getSubjectsCsv() != null && !p.getSubjectsCsv().isBlank()) score += 15;
        if (p.getTutoringPurpose() != null && !p.getTutoringPurpose().isBlank()) score += 15;
        if (p.getPreferredDaysCsv() != null && !p.getPreferredDaysCsv().isBlank()) score += 10;
        if (p.getPreferredTimeSlotsCsv() != null && !p.getPreferredTimeSlotsCsv().isBlank()) score += 10;
        if (Boolean.TRUE.equals(p.getTermsAccepted())) score += 5;
        if (Boolean.TRUE.equals(p.getPrivacyAccepted())) score += 5;
        return Math.min(score, 100);
    }

    private String joinList(Object value) {
        if (value instanceof List<?> list) {
            return String.join(",", list.stream().map(Object::toString).toList());
        }
        if (value instanceof String s) return s;
        return null;
    }

    private String stringOrNull(Object value) {
        return value == null ? null : value.toString();
    }

    private Map<String, Object> mapProfile(StudentProfile p, String authUserId, UserAccount user) {
        var map = new LinkedHashMap<String, Object>();
        map.put("id", p.getId());
        map.put("authUserId", authUserId);
        map.put("fullName", user != null ? user.getFullName() : null);
        map.put("email", user != null ? user.getEmail() : null);
        map.put("profilePhotoUrl", p.getProfilePhotoUrl());
        map.put("dateOfBirth", p.getDateOfBirth());
        map.put("gender", p.getGender());
        map.put("cityOrArea", p.getCityOrArea());
        map.put("educationLevel", p.getEducationLevel());
        map.put("currentGradeOrYear", p.getCurrentGradeOrYear());
        map.put("schoolOrInstitutionName", p.getSchoolOrInstitutionName());
        map.put("mediumOfEducation", p.getMediumOfEducation());
        map.put("subjects", p.getSubjectsCsv() != null ? Arrays.asList(p.getSubjectsCsv().split(",")) : List.of());
        map.put("subjectsOfInterest", p.getSubjectsCsv() != null ? Arrays.asList(p.getSubjectsCsv().split(",")) : List.of());
        map.put("topicsOfDifficulty", p.getTopicsOfDifficulty());
        map.put("tutoringPurpose", p.getTutoringPurpose());
        map.put("learningGoalsOrTargetGrade", p.getLearningGoalsOrTargetGrade());
        map.put("learningGoals", p.getLearningGoalsOrTargetGrade() != null ? Arrays.asList(p.getLearningGoalsOrTargetGrade().split(",")) : List.of());
        map.put("preferredMode", p.getPreferredMode());
        map.put("preferredDays", p.getPreferredDaysCsv() != null ? Arrays.asList(p.getPreferredDaysCsv().split(",")) : List.of());
        map.put("preferredTimeSlots", p.getPreferredTimeSlotsCsv() != null ? Arrays.asList(p.getPreferredTimeSlotsCsv().split(",")) : List.of());
        map.put("preferredSchedule", p.getPreferredTimeSlotsCsv() != null ? Arrays.asList(p.getPreferredTimeSlotsCsv().split(",")) : List.of());
        map.put("budgetPerSession", p.getBudgetPerSession());
        map.put("budgetPerMonth", p.getBudgetPerMonth());
        map.put("preferredTutorGender", p.getPreferredTutorGender());
        map.put("preferredLanguageOfInstruction", p.getPreferredLanguageOfInstruction());
        map.put("guardianFullName", p.getGuardianFullName());
        map.put("guardianContactNumber", p.getGuardianContactNumber());
        map.put("guardianEmailAddress", p.getGuardianEmailAddress());
        map.put("guardianRelationship", p.getGuardianRelationship());
        map.put("guardianConsentAcknowledgment", p.getGuardianConsentAcknowledgment());
        map.put("termsAccepted", p.getTermsAccepted());
        map.put("privacyAccepted", p.getPrivacyAccepted());
        map.put("profileCompleteness", p.getProfileCompleteness());
        map.put("createdAtUtc", p.getCreatedAtUtc());
        map.put("updatedAtUtc", p.getUpdatedAtUtc());
        return map;
    }
}
