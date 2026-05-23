using UserManagment.Domain.Enums;

namespace UserManagment.Domain.Entities;

public class UserWarning
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string TargetAuthUserId { get; set; } = string.Empty;
    public string TargetRole { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Severity { get; set; } = "Medium";
    public string Notes { get; set; } = string.Empty;
    public string? AttachmentUrl { get; set; }
    public string IssuedByAdminId { get; set; } = string.Empty;
    public string IssuedByAdminName { get; set; } = string.Empty;
    public DateTime IssuedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAtUtc { get; set; }
    public bool IsActive { get; set; } = true;

    public WarningStatus Status { get; set; } = WarningStatus.PendingReview;
    public string? DefenseMessage { get; set; }
    public string? DefenseAttachmentUrl { get; set; }
    public DateTime? DefenseSubmittedAtUtc { get; set; }
    public string? ReviewedByAdminId { get; set; }
    public string? ReviewedByAdminName { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public string? ReviewNotes { get; set; }
}
