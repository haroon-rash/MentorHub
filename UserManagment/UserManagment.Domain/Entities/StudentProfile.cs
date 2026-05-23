namespace UserManagment.Domain.Entities;

public class StudentProfile
{
    public Guid Id { get; set; }
    public Guid UserAccountId { get; set; }

    public string ProfilePhotoUrl { get; set; } = string.Empty;

    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string CityOrArea { get; set; } = string.Empty;

    public string EducationLevel { get; set; } = string.Empty;
    public string CurrentGradeOrYear { get; set; } = string.Empty;
    public string? SchoolOrInstitutionName { get; set; }
    public string MediumOfEducation { get; set; } = string.Empty;

    public string SubjectsCsv { get; set; } = string.Empty;
    public string InterestsCsv { get; set; } = string.Empty;
    public string? TopicsOfDifficulty { get; set; }
    public string TutoringPurpose { get; set; } = string.Empty;
    public string? LearningGoalsOrTargetGrade { get; set; }

    public string PreferredMode { get; set; } = "Online";
    public string PreferredDaysCsv { get; set; } = string.Empty;
    public string PreferredTimeSlotsCsv { get; set; } = string.Empty;
    public decimal? BudgetPerSession { get; set; }
    public decimal? BudgetPerMonth { get; set; }
    public string? PreferredTutorGender { get; set; }
    public string PreferredLanguageOfInstruction { get; set; } = "English";

    public string? GuardianFullName { get; set; }
    public string? GuardianContactNumber { get; set; }
    public string? GuardianEmailAddress { get; set; }
    public string? GuardianRelationship { get; set; }
    public bool GuardianConsentAcknowledgment { get; set; }

    public bool TermsAccepted { get; set; }
    public bool PrivacyAccepted { get; set; }

    public int ProfileCompleteness { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public UserAccount UserAccount { get; set; } = null!;

    public bool IsMinor()
    {
        if (!DateOfBirth.HasValue)
        {
            return false;
        }

        var today = DateTime.UtcNow.Date;
        var birthDate = DateOfBirth.Value.Date;
        var age = today.Year - birthDate.Year;
        if (birthDate > today.AddYears(-age))
        {
            age--;
        }

        return age < 18;
    }

    public int CalculateProfileCompleteness()
    {
        var checks = new List<bool>
        {
            !string.IsNullOrWhiteSpace(ProfilePhotoUrl),
            DateOfBirth.HasValue,
            !string.IsNullOrWhiteSpace(CityOrArea),
            !string.IsNullOrWhiteSpace(EducationLevel),
            !string.IsNullOrWhiteSpace(CurrentGradeOrYear),
            !string.IsNullOrWhiteSpace(MediumOfEducation),
            !string.IsNullOrWhiteSpace(SubjectsCsv),
            !string.IsNullOrWhiteSpace(InterestsCsv),
            !string.IsNullOrWhiteSpace(TutoringPurpose),
            !string.IsNullOrWhiteSpace(PreferredMode),
            !string.IsNullOrWhiteSpace(PreferredDaysCsv),
            !string.IsNullOrWhiteSpace(PreferredTimeSlotsCsv),
            !string.IsNullOrWhiteSpace(PreferredLanguageOfInstruction),
            TermsAccepted,
            PrivacyAccepted
        };

        if (IsMinor())
        {
            checks.Add(!string.IsNullOrWhiteSpace(GuardianFullName));
            checks.Add(!string.IsNullOrWhiteSpace(GuardianContactNumber));
            checks.Add(!string.IsNullOrWhiteSpace(GuardianRelationship));
            checks.Add(GuardianConsentAcknowledgment);
        }

        var completed = checks.Count(value => value);
        return (int)Math.Round((completed / (double)checks.Count) * 100, MidpointRounding.AwayFromZero);
    }
}
