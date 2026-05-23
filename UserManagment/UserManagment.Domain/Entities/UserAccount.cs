using UserManagment.Domain.Enums;

namespace UserManagment.Domain.Entities;

public class UserAccount
{
    public Guid Id { get; set; }
    public string AuthUserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public PlatformUserRole Role { get; set; }
    public bool IsEmailVerified { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public TutorProfile? TutorProfile { get; set; }
    public StudentProfile? StudentProfile { get; set; }
}
