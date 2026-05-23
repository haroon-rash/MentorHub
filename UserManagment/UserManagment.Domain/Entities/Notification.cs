using UserManagment.Domain.Enums;

namespace UserManagment.Domain.Entities;

public class Notification
{
    public Guid Id { get; set; }
    public string RecipientAuthUserId { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;
    public Guid? RelatedEntityId { get; set; }   // bookingId, reviewId, etc.
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAtUtc { get; set; }
}
