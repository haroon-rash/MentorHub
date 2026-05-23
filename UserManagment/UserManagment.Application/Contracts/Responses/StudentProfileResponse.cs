namespace UserManagment.Application.Contracts.Responses;

public class StudentProfileResponse
{
    public Guid StudentProfileId { get; set; }
    public string AuthUserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? ProfilePhotoUrl { get; set; }

    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string CityOrArea { get; set; } = string.Empty;

    public string EducationLevel { get; set; } = string.Empty;
    public string CurrentGradeOrYear { get; set; } = string.Empty;
    public string? SchoolOrInstitutionName { get; set; }
    public string MediumOfEducation { get; set; } = string.Empty;

    public IReadOnlyCollection<string> Subjects { get; set; } = Array.Empty<string>();
    public IReadOnlyCollection<string> Interests { get; set; } = Array.Empty<string>();
    public string? TopicsOfDifficulty { get; set; }
    public string TutoringPurpose { get; set; } = string.Empty;
    public string? LearningGoalsOrTargetGrade { get; set; }

    public string PreferredMode { get; set; } = string.Empty;
    public IReadOnlyCollection<string> PreferredDays { get; set; } = Array.Empty<string>();
    public IReadOnlyCollection<string> PreferredTimeSlots { get; set; } = Array.Empty<string>();
    public decimal? BudgetPerSession { get; set; }
    public decimal? BudgetPerMonth { get; set; }
    public string? PreferredTutorGender { get; set; }
    public string PreferredLanguageOfInstruction { get; set; } = string.Empty;

    public string? GuardianFullName { get; set; }
    public string? GuardianContactNumber { get; set; }
    public string? GuardianEmailAddress { get; set; }
    public string? GuardianRelationship { get; set; }
    public bool GuardianConsentAcknowledgment { get; set; }

    public bool TermsAccepted { get; set; }
    public bool PrivacyAccepted { get; set; }

    public bool IsMinor { get; set; }
    public int ProfileCompleteness { get; set; }
}
