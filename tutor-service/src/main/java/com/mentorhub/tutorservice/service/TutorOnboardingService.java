package com.mentorhub.tutorservice.service;

import com.mentorhub.tutorservice.model.*;
import com.mentorhub.tutorservice.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class TutorOnboardingService {

    private final TutorProfileRepository tutorProfileRepository;
    private final UserAccountRepository userAccountRepository;

    public Map<String, Object> getTutorProfile(String authUserId) {
        var tp = tutorProfileRepository.findByAuthUserId(authUserId).orElse(null);
        if (tp == null) return null;
        return mapProfile(tp);
    }

    @Transactional
    public Map<String, Object> upsertTutorProfile(String authUserId, Map<String, Object> req) {
        var ua = userAccountRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new IllegalArgumentException("User account not found"));

        var tp = tutorProfileRepository.findByAuthUserId(authUserId).orElse(null);
        if (tp == null) {
            tp = TutorProfile.builder()
                    .id(UUID.randomUUID())
                    .userAccountId(ua.getId())
                    .verificationStatus(TutorVerificationStatuses.PENDING)
                    .createdAtUtc(Instant.now())
                    .build();
        }

        boolean wasApproved = tp.getVerificationStatus() != null
                && tp.getVerificationStatus() == TutorVerificationStatuses.APPROVED;
        boolean touchesVerificationDocs = req.containsKey("degreeCertificateUrl")
                || req.containsKey("governmentIdDocumentUrl")
                || req.containsKey("teachingLicensesOrCertificatesUrl")
                || req.containsKey("highestDegree")
                || req.containsKey("yearsOfExperience")
                || req.containsKey("institutionName")
                || req.containsKey("graduationYear");

        if (!wasApproved && !TutorVerificationStatuses.canEditProfile(tp.getVerificationStatus())) {
            throw new IllegalArgumentException("Approved tutors cannot modify their profile.");
        }

        if (req.containsKey("fullName") && req.get("fullName") != null) {
            ua.setFullName(req.get("fullName").toString());
            userAccountRepository.save(ua);
        }
        if (req.containsKey("highestDegree")) tp.setHighestDegree((String) req.get("highestDegree"));
        if (req.containsKey("fieldOfStudy")) tp.setFieldOfStudy((String) req.get("fieldOfStudy"));
        if (req.containsKey("institutionName")) tp.setInstitutionName((String) req.get("institutionName"));
        if (req.containsKey("graduationYear")) {
            try {
                tp.setGraduationYear(Integer.parseInt(req.get("graduationYear").toString()));
            } catch (Exception e) {
                tp.setGraduationYear(null);
            }
        }
        if (req.containsKey("yearsOfExperience")) {
            try {
                tp.setYearsOfExperience(Integer.parseInt(req.get("yearsOfExperience").toString()));
            } catch (Exception e) {
                tp.setYearsOfExperience(0);
            }
        }
        if (req.containsKey("gradeLevels")) {
            var grades = req.get("gradeLevels");
            if (grades instanceof List<?> list) tp.setGradeLevelsCsv(String.join(",", list.stream().map(Object::toString).toList()));
            else if (grades instanceof String s) tp.setGradeLevelsCsv(s);
        }
        if (req.containsKey("languages")) {
            var langs = req.get("languages");
            if (langs instanceof List<?> list) tp.setLanguagesCsv(String.join(",", list.stream().map(Object::toString).toList()));
            else if (langs instanceof String s) tp.setLanguagesCsv(s);
        }
        if (req.containsKey("availableDays")) {
            var days = req.get("availableDays");
            if (days instanceof List<?> list) tp.setAvailableDaysCsv(String.join(",", list.stream().map(Object::toString).toList()));
            else if (days instanceof String s) tp.setAvailableDaysCsv(s);
        }
        if (req.containsKey("availableTimeSlots")) {
            var slots = req.get("availableTimeSlots");
            if (slots instanceof List<?> list) tp.setAvailableTimeSlotsCsv(String.join(",", list.stream().map(Object::toString).toList()));
            else if (slots instanceof String s) tp.setAvailableTimeSlotsCsv(s);
        }
        if (req.containsKey("achievements")) tp.setAchievements((String) req.get("achievements"));
        if (req.containsKey("monthlyFee")) {
            try {
                tp.setMonthlyFee(new BigDecimal(req.get("monthlyFee").toString()));
            } catch (Exception e) {
                tp.setMonthlyFee(null);
            }
        }
        if (req.containsKey("bio")) tp.setBio((String) req.get("bio"));
        if (req.containsKey("teachingMethodology")) tp.setTeachingMethodology((String) req.get("teachingMethodology"));
        if (req.containsKey("hourlyFee")) {
            try {
                tp.setHourlyFee(new BigDecimal(req.get("hourlyFee").toString()));
            } catch (Exception e) {
                tp.setHourlyFee(BigDecimal.ZERO);
            }
        }
        if (req.containsKey("inPersonLocation")) tp.setInPersonLocation((String) req.get("inPersonLocation"));
        if (req.containsKey("profilePhotoUrl")) tp.setProfilePhotoUrl((String) req.get("profilePhotoUrl"));
        if (req.containsKey("degreeCertificateUrl")) tp.setDegreeCertificateUrl((String) req.get("degreeCertificateUrl"));
        if (req.containsKey("governmentIdDocumentUrl")) tp.setGovernmentIdDocumentUrl((String) req.get("governmentIdDocumentUrl"));
        if (req.containsKey("teachingLicensesOrCertificatesUrl")) tp.setTeachingLicensesOrCertificatesUrl((String) req.get("teachingLicensesOrCertificatesUrl"));
        
        if (req.containsKey("termsAccepted")) tp.setTermsAccepted(Boolean.parseBoolean(req.get("termsAccepted").toString()));
        if (req.containsKey("privacyAccepted")) tp.setPrivacyAccepted(Boolean.parseBoolean(req.get("privacyAccepted").toString()));
        if (req.containsKey("commissionPolicyAccepted")) tp.setCommissionPolicyAccepted(Boolean.parseBoolean(req.get("commissionPolicyAccepted").toString()));
        if (req.containsKey("backgroundCheckConsent")) tp.setBackgroundCheckConsent(Boolean.parseBoolean(req.get("backgroundCheckConsent").toString()));
        
        if (req.containsKey("governmentIdType")) {
            String idType = req.get("governmentIdType").toString();
            tp.setGovernmentIdType(switch (idType.toUpperCase()) {
                case "CNIC" -> 0;
                case "PASSPORT" -> 1;
                case "DRIVINGLICENSE", "DRIVING_LICENSE" -> 2;
                case "OTHER" -> 3;
                default -> {
                    try {
                        yield Integer.parseInt(idType);
                    } catch (Exception e) {
                        yield 0;
                    }
                }
            });
        }

        if (req.containsKey("subjects")) {
            var subjects = req.get("subjects");
            if (subjects instanceof List<?> list) tp.setSubjectsCsv(String.join(",", list.stream().map(Object::toString).toList()));
            else if (subjects instanceof String s) tp.setSubjectsCsv(s);
        }
        if (req.containsKey("teachingMode")) {
            var mode = req.get("teachingMode").toString();
            tp.setTeachingMode(switch (mode.toUpperCase()) { case "ONLINE" -> 0; case "IN_PERSON", "INPERSON" -> 1; case "BOTH" -> 2; default -> 0; });
        }

        // Calculate profile completeness
        int completeness = 0;
        if (tp.getHighestDegree() != null && !tp.getHighestDegree().isBlank()) completeness += 15;
        if (tp.getYearsOfExperience() != null && tp.getYearsOfExperience() > 0) completeness += 10;
        if (tp.getSubjectsCsv() != null && !tp.getSubjectsCsv().isBlank()) completeness += 15;
        if (tp.getBio() != null && !tp.getBio().isBlank()) completeness += 15;
        if (tp.getTeachingMethodology() != null && !tp.getTeachingMethodology().isBlank()) completeness += 10;
        if (tp.getHourlyFee() != null && tp.getHourlyFee().compareTo(BigDecimal.ZERO) > 0) completeness += 10;
        if (tp.getProfilePhotoUrl() != null && !tp.getProfilePhotoUrl().isBlank()) completeness += 10;
        if (tp.getDegreeCertificateUrl() != null && !tp.getDegreeCertificateUrl().isBlank()) completeness += 5;
        if (tp.getGovernmentIdDocumentUrl() != null && !tp.getGovernmentIdDocumentUrl().isBlank()) completeness += 5;
        if (tp.getTeachingLicensesOrCertificatesUrl() != null && !tp.getTeachingLicensesOrCertificatesUrl().isBlank()) completeness += 5;
        tp.setProfileCompleteness(completeness);

        if (wasApproved && touchesVerificationDocs) {
            tp.setVerificationStatus(TutorVerificationStatuses.PENDING);
        } else if (!wasApproved) {
            tp.setVerificationStatus(TutorVerificationStatuses.PENDING);
        }
        tp.setUpdatedAtUtc(Instant.now());
        tutorProfileRepository.save(tp);

        return mapProfile(tp, ua);
    }

    private Map<String, Object> mapProfile(TutorProfile tp) {
        var ua = userAccountRepository.findById(tp.getUserAccountId()).orElse(null);
        return mapProfile(tp, ua);
    }

    private Map<String, Object> mapProfile(TutorProfile tp, UserAccount ua) {
        var map = new LinkedHashMap<String, Object>();
        map.put("id", tp.getId());
        map.put("authUserId", ua != null ? ua.getAuthUserId() : null);
        map.put("fullName", ua != null ? ua.getFullName() : null);
        map.put("email", ua != null ? ua.getEmail() : null);
        map.put("highestDegree", tp.getHighestDegree());
        map.put("yearsOfExperience", tp.getYearsOfExperience());
        map.put("subjects", tp.getSubjectsCsv() != null ? Arrays.asList(tp.getSubjectsCsv().split(",")) : List.of());
        map.put("bio", tp.getBio());
        map.put("teachingMethodology", tp.getTeachingMethodology());
        map.put("hourlyFee", tp.getHourlyFee());
        map.put("teachingMode", switch (tp.getTeachingMode()) { case 0 -> "Online"; case 1 -> "InPerson"; case 2 -> "Both"; default -> "Online"; });
        map.put("inPersonLocation", tp.getInPersonLocation());
        map.put("profilePhotoUrl", tp.getProfilePhotoUrl());
        map.put("degreeCertificateUrl", tp.getDegreeCertificateUrl());
        map.put("governmentIdDocumentUrl", tp.getGovernmentIdDocumentUrl());
        map.put("teachingLicensesOrCertificatesUrl", tp.getTeachingLicensesOrCertificatesUrl());
        map.put("verificationStatus", TutorVerificationStatuses.toApiString(tp.getVerificationStatus()));
        map.put("verificationNotes", tp.getVerificationNotes());
        map.put("profileCompleteness", tp.getProfileCompleteness());
        map.put("averageRating", tp.getAverageRating());
        map.put("reviewCount", tp.getReviewCount());
        map.put("createdAtUtc", tp.getCreatedAtUtc());
        return map;
    }
}
