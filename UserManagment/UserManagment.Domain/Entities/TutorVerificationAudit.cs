namespace UserManagment.Domain.Entities;

public class TutorVerificationAudit
{
    public Guid Id { get; set; }
    public Guid TutorProfileId { get; set; }
    public string AdminId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime ActionAtUtc { get; set; } = DateTime.UtcNow;

    public TutorProfile TutorProfile { get; set; } = null!;
}
