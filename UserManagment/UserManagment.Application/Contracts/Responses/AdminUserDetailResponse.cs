namespace UserManagment.Application.Contracts.Responses;

public class AdminUserDetailResponse
{
    public Guid Id { get; set; }
    public string AuthUserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Role { get; set; } = string.Empty;
    public bool IsEmailVerified { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public TutorDetailSection? Tutor { get; set; }
    public StudentDetailSection? Student { get; set; }
    public IReadOnlyCollection<ModerationWarningSummary> Warnings { get; set; } = Array.Empty<ModerationWarningSummary>();
    public IReadOnlyCollection<ModerationRestrictionSummary> Restrictions { get; set; } = Array.Empty<ModerationRestrictionSummary>();
    public IReadOnlyCollection<TutorVerificationAuditSummary> VerificationHistory { get; set; } = Array.Empty<TutorVerificationAuditSummary>();
    public UserActivitySummary Activity { get; set; } = new();
}

public class TutorDetailSection
{
    public Guid TutorProfileId { get; set; }
    public string VerificationStatus { get; set; } = string.Empty;
    public string? VerificationNotes { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public int ProfileCompleteness { get; set; }
    public string? ProfilePhotoUrl { get; set; }
    public string? HighestDegree { get; set; }
    public string? FieldOfStudy { get; set; }
    public string? InstitutionName { get; set; }
    public int? GraduationYear { get; set; }
    public int? YearsOfExperience { get; set; }
    public string[] Subjects { get; set; } = Array.Empty<string>();
    public string[] GradeLevels { get; set; } = Array.Empty<string>();
    public string[] Languages { get; set; } = Array.Empty<string>();
    public string[] AvailableDays { get; set; } = Array.Empty<string>();
    public string[] AvailableTimeSlots { get; set; } = Array.Empty<string>();
    public string? Bio { get; set; }
    public string? TeachingMethodology { get; set; }
    public string? Achievements { get; set; }
    public decimal? HourlyFee { get; set; }
    public decimal? MonthlyFee { get; set; }
    public string? TeachingMode { get; set; }
    public string? InPersonLocation { get; set; }
    public string? GovernmentIdType { get; set; }
    public string? DegreeCertificateUrl { get; set; }
    public string? GovernmentIdDocumentUrl { get; set; }
    public string? TeachingLicensesOrCertificatesUrl { get; set; }
    public bool BackgroundCheckConsent { get; set; }
    public bool TermsAccepted { get; set; }
    public bool PrivacyAccepted { get; set; }
    public bool CommissionPolicyAccepted { get; set; }
}

public class StudentDetailSection
{
    public Guid StudentProfileId { get; set; }
    public string? ProfilePhotoUrl { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? CityOrArea { get; set; }
    public string? EducationLevel { get; set; }
    public string? GradeLevel { get; set; }
    public string? SchoolOrInstitution { get; set; }
    public string? MediumOfEducation { get; set; }
    public string[] Subjects { get; set; } = Array.Empty<string>();
    public string? TopicsOfDifficulty { get; set; }
    public string? TutoringPurpose { get; set; }
    public string? LearningGoals { get; set; }
    public string? PreferredMode { get; set; }
    public string[] PreferredDays { get; set; } = Array.Empty<string>();
    public string[] PreferredTimeSlots { get; set; } = Array.Empty<string>();
    public decimal? BudgetPerSession { get; set; }
    public decimal? BudgetPerMonth { get; set; }
    public string? PreferredTutorGender { get; set; }
    public string? PreferredLanguageOfInstruction { get; set; }
    public string? GuardianFullName { get; set; }
    public string? GuardianContactNumber { get; set; }
    public string? GuardianEmailAddress { get; set; }
    public string? GuardianRelationship { get; set; }
    public bool GuardianConsentAcknowledgment { get; set; }
    public bool TermsAccepted { get; set; }
    public bool PrivacyAccepted { get; set; }
    public int ProfileCompleteness { get; set; }
}

public class ModerationWarningSummary
{
    public Guid Id { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public DateTime IssuedAtUtc { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public bool IsActive { get; set; }
}

public class ModerationRestrictionSummary
{
    public Guid Id { get; set; }
    public string RestrictionType { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public DateTime StartsAtUtc { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public bool IsActive { get; set; }
}

public class TutorVerificationAuditSummary
{
    public string Action { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string AdminId { get; set; } = string.Empty;
    public DateTime ActionAtUtc { get; set; }
}

public class UserActivitySummary
{
    public int TotalBookings { get; set; }
    public int CompletedBookings { get; set; }
    public int PendingBookings { get; set; }
}

public class AdminUserLookupResponse
{
    public Guid Id { get; set; }
    public string AuthUserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsEmailVerified { get; set; }
    public string? ProfilePhotoUrl { get; set; }
    public string? TutorVerificationStatus { get; set; }
    public int ActiveWarningCount { get; set; }
    public bool HasActiveRestriction { get; set; }
}
