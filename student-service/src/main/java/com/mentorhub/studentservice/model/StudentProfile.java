package com.mentorhub.studentservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "student_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StudentProfile {
    @Id
    @Column(name = "\"Id\"")
    private UUID id;

    @Column(name = "\"UserAccountId\"", nullable = false)
    private UUID userAccountId;

    @Column(name = "\"ProfilePhotoUrl\"")
    private String profilePhotoUrl;

    @Column(name = "\"DateOfBirth\"")
    private Instant dateOfBirth;

    @Column(name = "\"Gender\"", length = 40)
    private String gender;

    @Column(name = "\"CityOrArea\"", length = 160)
    private String cityOrArea;

    @Column(name = "\"EducationLevel\"", length = 120)
    private String educationLevel;

    @Column(name = "\"CurrentGradeOrYear\"", length = 120)
    private String currentGradeOrYear;

    @Column(name = "\"SchoolOrInstitutionName\"", length = 240)
    private String schoolOrInstitutionName;

    @Column(name = "\"MediumOfEducation\"", length = 60)
    private String mediumOfEducation;

    @Column(name = "\"SubjectsCsv\"")
    private String subjectsCsv;

    @Column(name = "\"TopicsOfDifficulty\"", length = 1200)
    private String topicsOfDifficulty;

    @Column(name = "\"TutoringPurpose\"", length = 500)
    private String tutoringPurpose;

    @Column(name = "\"LearningGoalsOrTargetGrade\"", length = 500)
    private String learningGoalsOrTargetGrade;

    @Column(name = "\"PreferredMode\"", length = 50)
    private String preferredMode;

    @Column(name = "\"PreferredDaysCsv\"")
    private String preferredDaysCsv;

    @Column(name = "\"PreferredTimeSlotsCsv\"")
    private String preferredTimeSlotsCsv;

    @Column(name = "\"BudgetPerSession\"")
    private BigDecimal budgetPerSession;

    @Column(name = "\"BudgetPerMonth\"")
    private BigDecimal budgetPerMonth;

    @Column(name = "\"PreferredTutorGender\"", length = 40)
    private String preferredTutorGender;

    @Column(name = "\"PreferredLanguageOfInstruction\"", length = 80)
    private String preferredLanguageOfInstruction;

    @Column(name = "\"GuardianFullName\"", length = 180)
    private String guardianFullName;

    @Column(name = "\"GuardianContactNumber\"", length = 40)
    private String guardianContactNumber;

    @Column(name = "\"GuardianEmailAddress\"", length = 180)
    private String guardianEmailAddress;

    @Column(name = "\"GuardianRelationship\"", length = 100)
    private String guardianRelationship;

    @Column(name = "\"GuardianConsentAcknowledgment\"")
    private Boolean guardianConsentAcknowledgment;

    @Column(name = "\"TermsAccepted\"")
    private Boolean termsAccepted;

    @Column(name = "\"PrivacyAccepted\"")
    private Boolean privacyAccepted;

    @Column(name = "\"ProfileCompleteness\"")
    private Integer profileCompleteness;

    @Column(name = "\"CreatedAtUtc\"", nullable = false)
    private Instant createdAtUtc;

    @Column(name = "\"UpdatedAtUtc\"")
    private Instant updatedAtUtc;
}
