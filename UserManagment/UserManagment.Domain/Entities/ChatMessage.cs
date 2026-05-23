namespace UserManagment.Domain.Entities;

public class ChatMessage
{
    public Guid Id { get; set; }
    public string SenderAuthUserId { get; set; } = string.Empty;
    public string ReceiverAuthUserId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime SentAtUtc { get; set; }
    public bool IsRead { get; set; }
}
