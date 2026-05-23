namespace UserManagment.Application.Contracts.Responses;

public class UserDirectoryResponse
{
    public Guid Id { get; set; }
    public string AuthUserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsEmailVerified { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public string? ProfilePhotoUrl { get; set; }
    public Guid? TutorProfileId { get; set; }
    /// <summary>Pending | Approved | Rejected — tutors only.</summary>
    public string? TutorVerificationStatus { get; set; }
    public int ActiveWarningCount { get; set; }
    public bool HasActiveRestriction { get; set; }
}
