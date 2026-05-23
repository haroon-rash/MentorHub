using System.ComponentModel.DataAnnotations;

namespace UserManagment.Application.Contracts.Requests;

public class TutorOnboardingRequest
{
    [Required(ErrorMessage = "Full Name is required.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Full Name must be between 2 and 100 characters.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Invalid email format.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone Number is required.")]
    public string PhoneNumber { get; set; } = string.Empty;

    public string ProfilePhotoUrl { get; set; } = string.Empty;

    [Required(ErrorMessage = "Highest Degree is required.")]
    public string HighestDegree { get; set; } = string.Empty;

    [Required(ErrorMessage = "Field of Study is required.")]
    public string FieldOfStudy { get; set; } = string.Empty;

    [Required(ErrorMessage = "Institution Name is required.")]
    public string InstitutionName { get; set; } = string.Empty;

    [Range(1950, 2100, ErrorMessage = "Graduation Year must be a valid year.")]
    public int GraduationYear { get; set; }

    public string DegreeCertificateUrl { get; set; } = string.Empty;

    [MinLength(1, ErrorMessage = "At least one subject is required.")]
    public List<string> Subjects { get; set; } = new();

    [MinLength(1, ErrorMessage = "At least one grade level is required.")]
    public List<string> GradeLevels { get; set; } = new();

    [Range(0, 100, ErrorMessage = "Years of Experience must be between 0 and 100.")]
    public int YearsOfExperience { get; set; }

    [MinLength(1, ErrorMessage = "At least one language is required.")]
    public List<string> Languages { get; set; } = new();

    public string TeachingMode { get; set; } = "Online";
    public string InPersonLocation { get; set; } = string.Empty;

    [Range(0, 10000, ErrorMessage = "Hourly Fee must be valid.")]
    public decimal HourlyFee { get; set; }

    public decimal? MonthlyFee { get; set; }

    [MinLength(1, ErrorMessage = "At least one available day is required.")]
    public List<string> AvailableDays { get; set; } = new();

    [MinLength(1, ErrorMessage = "At least one available time slot is required.")]
    public List<string> AvailableTimeSlots { get; set; } = new();

    public List<string> UnavailableDates { get; set; } = new();

    [Required(ErrorMessage = "Bio is required.")]
    [StringLength(1000, MinimumLength = 10, ErrorMessage = "Bio must be at least 10 characters long.")]
    public string Bio { get; set; } = string.Empty;

    [Required(ErrorMessage = "Teaching Methodology is required.")]
    public string TeachingMethodology { get; set; } = string.Empty;

    public string Achievements { get; set; } = string.Empty;

    public string GovernmentIdType { get; set; } = "Cnic";
    public string GovernmentIdDocumentUrl { get; set; } = string.Empty;
    public bool BackgroundCheckConsent { get; set; }
    public string TeachingLicensesOrCertificatesUrl { get; set; } = string.Empty;

    public bool TermsAccepted { get; set; }
    public bool PrivacyAccepted { get; set; }
    public bool CommissionPolicyAccepted { get; set; }
}

