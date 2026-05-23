namespace UserManagment.Domain.Entities;

public class AdminActionAudit
{
    public Guid Id { get; set; }
    public string AdminAuthUserId { get; set; } = string.Empty;
    public string AdminEmail { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? TargetAuthUserId { get; set; }
    public string? TargetEmail { get; set; }
    public Guid? TargetUserAccountId { get; set; }
    public string? Reason { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
