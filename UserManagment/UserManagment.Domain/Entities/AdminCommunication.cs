namespace UserManagment.Domain.Entities;

public class AdminCommunication
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Audience { get; set; } = "ALL";
    public string? TargetAuthUserId { get; set; }
    public string? AttachmentUrl { get; set; }
    public string SentByAdminId { get; set; } = string.Empty;
    public string SentByAdminName { get; set; } = string.Empty;
    public int RecipientCount { get; set; }
    public DateTime SentAtUtc { get; set; } = DateTime.UtcNow;
}
