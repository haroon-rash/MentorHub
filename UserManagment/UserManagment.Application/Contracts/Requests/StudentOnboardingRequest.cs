using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace UserManagment.Application.Contracts.Requests;

public class StudentOnboardingRequest : IValidatableObject
{
    [Required(ErrorMessage = "Full Name is required.")]
    [StringLength(100, MinimumLength = 2)]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone Number is required.")]
    public string PhoneNumber { get; set; } = string.Empty;

    public string? ProfilePhotoUrl { get; set; }

    [Required]
    [Range(typeof(DateTime), "1/1/1900", "1/1/2100", ErrorMessage = "Date of Birth must be a valid date.")]
    public DateTime DateOfBirth { get; set; }

    public string? Gender { get; set; }

    [Required]
    public string CityOrArea { get; set; } = string.Empty;

    [Required]
    public string EducationLevel { get; set; } = string.Empty;

    [Required]
    public string CurrentGradeOrYear { get; set; } = string.Empty;

    public string? SchoolOrInstitutionName { get; set; }

    [Required]
    public string MediumOfEducation { get; set; } = "English";

    [MinLength(1, ErrorMessage = "At least one subject is required.")]
    public List<string> Subjects { get; set; } = new();

    [MinLength(1, ErrorMessage = "At least one learning interest is required.")]
    public List<string> Interests { get; set; } = new();

    public string? TopicsOfDifficulty { get; set; }

    [Required]
    public string TutoringPurpose { get; set; } = string.Empty;

    public string? LearningGoalsOrTargetGrade { get; set; }

    [Required]
    public string PreferredMode { get; set; } = "Online";

    [MinLength(1, ErrorMessage = "At least one preferred day is required.")]
    public List<string> PreferredDays { get; set; } = new();

    [MinLength(1, ErrorMessage = "At least one preferred time slot is required.")]
    public List<string> PreferredTimeSlots { get; set; } = new();

    public decimal? BudgetPerSession { get; set; }
    public decimal? BudgetPerMonth { get; set; }
    public string? PreferredTutorGender { get; set; }

    [Required]
    public string PreferredLanguageOfInstruction { get; set; } = "English";

    public string? GuardianFullName { get; set; }
    public string? GuardianContactNumber { get; set; }
    public string? GuardianEmailAddress { get; set; }
    public string? GuardianRelationship { get; set; }
    public bool GuardianConsentAcknowledgment { get; set; }

    public bool TermsAccepted { get; set; }
    public bool PrivacyAccepted { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (DateOfBirth > DateTime.UtcNow.Date)
        {
            yield return new ValidationResult("Date of Birth cannot be in the future.", new[] { nameof(DateOfBirth) });
        }

        if (!TermsAccepted)
        {
            yield return new ValidationResult("You must accept the Terms and Conditions.", new[] { nameof(TermsAccepted) });
        }

        if (!PrivacyAccepted)
        {
            yield return new ValidationResult("You must accept the Privacy Policy.", new[] { nameof(PrivacyAccepted) });
        }

        var age = CalculateAge(DateOfBirth);
        if (age is < 18)
        {
            if (string.IsNullOrWhiteSpace(GuardianFullName))
            {
                yield return new ValidationResult("Guardian full name is required for students under 18.", new[] { nameof(GuardianFullName) });
            }

            if (string.IsNullOrWhiteSpace(GuardianContactNumber))
            {
                yield return new ValidationResult("Guardian contact number is required for students under 18.", new[] { nameof(GuardianContactNumber) });
            }

            if (string.IsNullOrWhiteSpace(GuardianRelationship))
            {
                yield return new ValidationResult("Guardian relationship is required for students under 18.", new[] { nameof(GuardianRelationship) });
            }

            if (!GuardianConsentAcknowledgment)
            {
                yield return new ValidationResult("Guardian consent is required for students under 18.", new[] { nameof(GuardianConsentAcknowledgment) });
            }
        }
        else if (GuardianConsentAcknowledgment && string.IsNullOrWhiteSpace(GuardianFullName))
        {
            yield return new ValidationResult("Guardian full name is required when guardian consent is acknowledged.", new[] { nameof(GuardianFullName) });
        }
    }

    private static int CalculateAge(DateTime dateOfBirth)
    {
        var today = DateTime.UtcNow.Date;
        var birthDate = dateOfBirth.Date;
        var age = today.Year - birthDate.Year;
        if (birthDate > today.AddYears(-age))
        {
            age--;
        }

        return age;
    }
}
