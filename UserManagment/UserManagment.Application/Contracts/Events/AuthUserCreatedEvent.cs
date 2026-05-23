namespace UserManagment.Application.Contracts.Events;

public class AuthUserCreatedEvent
{
    public string AuthId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsVerified { get; set; }
    public string Source { get; set; } = string.Empty;
}
