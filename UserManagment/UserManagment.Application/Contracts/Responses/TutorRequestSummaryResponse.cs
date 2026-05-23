namespace UserManagment.Application.Contracts.Responses;

public class TutorRequestSummaryResponse
{
    public Guid TutorProfileId { get; set; }
    public string AuthUserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string VerificationStatus { get; set; } = string.Empty;
    public int ProfileCompleteness { get; set; }
    public string HighestDegree { get; set; } = string.Empty;
    public int YearsOfExperience { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    
    // Detailed fields for review
    public string Bio { get; set; } = string.Empty;
    public string ProfilePhotoUrl { get; set; } = string.Empty;
    public string DegreeCertificateUrl { get; set; } = string.Empty;
    public string GovernmentIdDocumentUrl { get; set; } = string.Empty;
    public decimal HourlyFee { get; set; }
    public string[] Subjects { get; set; } = Array.Empty<string>();
    public string TeachingMethodology { get; set; } = string.Empty;
    public string TeachingMode { get; set; } = string.Empty;
    public string InPersonLocation { get; set; } = string.Empty;
    public string TeachingLicensesOrCertificatesUrl { get; set; } = string.Empty;
    public string VerificationNotes { get; set; } = string.Empty;
    public string FieldOfStudy { get; set; } = string.Empty;
    public string InstitutionName { get; set; } = string.Empty;
    public int GraduationYear { get; set; }
    public string[] GradeLevels { get; set; } = Array.Empty<string>();
    public string[] Languages { get; set; } = Array.Empty<string>();
    public string[] AvailableDays { get; set; } = Array.Empty<string>();
    public string[] AvailableTimeSlots { get; set; } = Array.Empty<string>();
    public decimal? MonthlyFee { get; set; }
    public string Achievements { get; set; } = string.Empty;
    public string GovernmentIdType { get; set; } = string.Empty;
    public bool BackgroundCheckConsent { get; set; }
    public bool TermsAccepted { get; set; }
    public bool PrivacyAccepted { get; set; }
    public bool CommissionPolicyAccepted { get; set; }
    /// <summary>Set when this email was previously removed by an admin (re-registration).</summary>
    public DateTime? PreviouslyRemovedAtUtc { get; set; }
    public string? PreviouslyRemovedReason { get; set; }
}
