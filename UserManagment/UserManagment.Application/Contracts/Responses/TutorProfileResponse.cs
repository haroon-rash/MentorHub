namespace UserManagment.Application.Contracts.Responses;

public class TutorProfileResponse
{
    public Guid Id { get; set; }
    public Guid TutorProfileId { get; set; }
    public string AuthUserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;

    public string Bio { get; set; } = string.Empty;
    public string TeachingMethodology { get; set; } = string.Empty;
    public string Achievements { get; set; } = string.Empty;
    public decimal HourlyFee { get; set; }
    public decimal? MonthlyFee { get; set; }
    public string HighestDegree { get; set; } = string.Empty;
    public string FieldOfStudy { get; set; } = string.Empty;
    public string InstitutionName { get; set; } = string.Empty;
    public int GraduationYear { get; set; }
    public int YearsOfExperience { get; set; }

    public string TeachingMode { get; set; } = string.Empty;
    public string InPersonLocation { get; set; } = string.Empty;

    public List<string> Subjects { get; set; } = new();
    public List<string> GradeLevels { get; set; } = new();
    public List<string> Languages { get; set; } = new();
    public List<string> AvailableDays { get; set; } = new();
    public List<string> AvailableTimeSlots { get; set; } = new();
    public List<string> UnavailableDates { get; set; } = new();

    public string ProfilePhotoUrl { get; set; } = string.Empty;
    public string DegreeCertificateUrl { get; set; } = string.Empty;
    public string GovernmentIdType { get; set; } = string.Empty;
    public string GovernmentIdDocumentUrl { get; set; } = string.Empty;
    public string TeachingLicensesOrCertificatesUrl { get; set; } = string.Empty;

    public bool BackgroundCheckConsent { get; set; }
    public bool TermsAccepted { get; set; }
    public bool PrivacyAccepted { get; set; }
    public bool CommissionPolicyAccepted { get; set; }

    public string VerificationStatus { get; set; } = string.Empty;
    public int ProfileCompleteness { get; set; }
    public string? VerificationNotes { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }

    // Ratings
    public double AverageRating { get; set; }
    public int ReviewCount { get; set; }
}
