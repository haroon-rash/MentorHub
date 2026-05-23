using System;

namespace UserManagment.Domain.Entities;

public class BlockedUser
{
    public Guid Id { get; set; }
    public string BlockerAuthUserId { get; set; } = string.Empty;
    public string BlockedAuthUserId { get; set; } = string.Empty;
    public DateTime BlockedAtUtc { get; set; } = DateTime.UtcNow;
}
