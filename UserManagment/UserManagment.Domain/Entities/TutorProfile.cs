using UserManagment.Domain.Enums;

namespace UserManagment.Domain.Entities;

public class TutorProfile
{
    public Guid Id { get; set; }
    public Guid UserAccountId { get; set; }

    public string ProfilePhotoUrl { get; set; } = string.Empty;
    public string HighestDegree { get; set; } = string.Empty;
    public string FieldOfStudy { get; set; } = string.Empty;
    public string InstitutionName { get; set; } = string.Empty;
    public int GraduationYear { get; set; }
    public string DegreeCertificateUrl { get; set; } = string.Empty;

    public string SubjectsCsv { get; set; } = string.Empty;
    public string GradeLevelsCsv { get; set; } = string.Empty;
    public int YearsOfExperience { get; set; }
    public string LanguagesCsv { get; set; } = string.Empty;

    public TeachingMode TeachingMode { get; set; }
    public string InPersonLocation { get; set; } = string.Empty;
    public decimal HourlyFee { get; set; }
    public decimal? MonthlyFee { get; set; }
    public string AvailableDaysCsv { get; set; } = string.Empty;
    public string AvailableTimeSlotsCsv { get; set; } = string.Empty;
    public string UnavailableDatesCsv { get; set; } = string.Empty;

    public string Bio { get; set; } = string.Empty;
    public string TeachingMethodology { get; set; } = string.Empty;
    public string Achievements { get; set; } = string.Empty;

    public GovernmentIdType GovernmentIdType { get; set; }
    public string GovernmentIdDocumentUrl { get; set; } = string.Empty;
    public bool BackgroundCheckConsent { get; set; }
    public string TeachingLicensesOrCertificatesUrl { get; set; } = string.Empty;

    public bool TermsAccepted { get; set; }
    public bool PrivacyAccepted { get; set; }
    public bool CommissionPolicyAccepted { get; set; }

    public TutorVerificationStatus VerificationStatus { get; set; } = TutorVerificationStatus.Pending;
    public string? VerificationNotes { get; set; }
    public string? ReviewedByAdminId { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }

    public int ProfileCompleteness { get; set; }
    public double? AverageRating { get; set; }
    public int ReviewCount { get; set; } = 0;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public UserAccount UserAccount { get; set; } = null!;

    public int CalculateProfileCompleteness()
    {
        var checks = new[]
        {
            !string.IsNullOrWhiteSpace(ProfilePhotoUrl),
            !string.IsNullOrWhiteSpace(HighestDegree),
            !string.IsNullOrWhiteSpace(FieldOfStudy),
            !string.IsNullOrWhiteSpace(InstitutionName),
            GraduationYear > 0,
            !string.IsNullOrWhiteSpace(DegreeCertificateUrl),
            !string.IsNullOrWhiteSpace(SubjectsCsv),
            !string.IsNullOrWhiteSpace(GradeLevelsCsv),
            YearsOfExperience >= 0,
            !string.IsNullOrWhiteSpace(LanguagesCsv),
            !string.IsNullOrWhiteSpace(AvailableDaysCsv),
            !string.IsNullOrWhiteSpace(AvailableTimeSlotsCsv),
            HourlyFee > 0,
            !string.IsNullOrWhiteSpace(Bio),
            !string.IsNullOrWhiteSpace(TeachingMethodology),
            !string.IsNullOrWhiteSpace(GovernmentIdDocumentUrl),
            BackgroundCheckConsent,
            TermsAccepted,
            PrivacyAccepted,
            CommissionPolicyAccepted
        };

        var completed = checks.Count(value => value);
        return (int)Math.Round((completed / (double)checks.Length) * 100, MidpointRounding.AwayFromZero);
    }
}
