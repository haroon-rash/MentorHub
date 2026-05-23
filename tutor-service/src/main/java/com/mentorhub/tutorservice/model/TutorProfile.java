package com.mentorhub.tutorservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tutor_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TutorProfile {
    @Id
    @Column(name = "\"Id\"")
    private UUID id;

    @Column(name = "\"UserAccountId\"", nullable = false)
    private UUID userAccountId;

    @Column(name = "\"ProfilePhotoUrl\"")
    private String profilePhotoUrl;

    @Column(name = "\"HighestDegree\"", length = 200)
    private String highestDegree;

    @Column(name = "\"FieldOfStudy\"", length = 200)
    private String fieldOfStudy;

    @Column(name = "\"InstitutionName\"", length = 240)
    private String institutionName;

    @Column(name = "\"GraduationYear\"")
    private Integer graduationYear;

    @Column(name = "\"DegreeCertificateUrl\"")
    private String degreeCertificateUrl;

    @Column(name = "\"SubjectsCsv\"")
    private String subjectsCsv;

    @Column(name = "\"GradeLevelsCsv\"")
    private String gradeLevelsCsv;

    @Column(name = "\"YearsOfExperience\"")
    private Integer yearsOfExperience;

    @Column(name = "\"LanguagesCsv\"")
    private String languagesCsv;

    @Column(name = "\"TeachingMode\"")
    private Integer teachingMode;

    @Column(name = "\"InPersonLocation\"", length = 240)
    private String inPersonLocation;

    @Column(name = "\"HourlyFee\"", precision = 12, scale = 2)
    private BigDecimal hourlyFee;

    @Column(name = "\"MonthlyFee\"", precision = 12, scale = 2)
    private BigDecimal monthlyFee;

    @Column(name = "\"AvailableDaysCsv\"")
    private String availableDaysCsv;

    @Column(name = "\"AvailableTimeSlotsCsv\"")
    private String availableTimeSlotsCsv;

    @Column(name = "\"Bio\"")
    private String bio;

    @Column(name = "\"TeachingMethodology\"")
    private String teachingMethodology;

    @Column(name = "\"Achievements\"")
    private String achievements;

    @Column(name = "\"GovernmentIdType\"")
    private Integer governmentIdType;

    @Column(name = "\"GovernmentIdDocumentUrl\"")
    private String governmentIdDocumentUrl;

    @Column(name = "\"BackgroundCheckConsent\"")
    private Boolean backgroundCheckConsent;

    @Column(name = "\"TeachingLicensesOrCertificatesUrl\"")
    private String teachingLicensesOrCertificatesUrl;

    @Column(name = "\"TermsAccepted\"")
    private Boolean termsAccepted;

    @Column(name = "\"PrivacyAccepted\"")
    private Boolean privacyAccepted;

    @Column(name = "\"CommissionPolicyAccepted\"")
    private Boolean commissionPolicyAccepted;

    @Column(name = "\"VerificationStatus\"")
    private Integer verificationStatus;

    @Column(name = "\"VerificationNotes\"", length = 1500)
    private String verificationNotes;

    @Column(name = "\"ReviewedByAdminId\"", length = 120)
    private String reviewedByAdminId;

    @Column(name = "\"ReviewedAtUtc\"")
    private Instant reviewedAtUtc;

    @Column(name = "\"ProfileCompleteness\"")
    private Integer profileCompleteness;

    @Column(name = "\"AverageRating\"")
    private Double averageRating;

    @Column(name = "\"ReviewCount\"")
    private Integer reviewCount;

    @Column(name = "\"CreatedAtUtc\"", nullable = false)
    private Instant createdAtUtc;

    @Column(name = "\"UpdatedAtUtc\"")
    private Instant updatedAtUtc;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"UserAccountId\"", insertable = false, updatable = false)
    private UserAccount userAccount;
}
