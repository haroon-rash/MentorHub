namespace UserManagment.Domain.Entities;

public class AccountRestriction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string TargetAuthUserId { get; set; } = string.Empty;
    public string RestrictionType { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string IssuedByAdminId { get; set; } = string.Empty;
    public DateTime StartsAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAtUtc { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAtUtc { get; set; }
}
