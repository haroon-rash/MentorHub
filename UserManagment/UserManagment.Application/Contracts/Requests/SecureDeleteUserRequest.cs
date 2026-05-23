namespace UserManagment.Application.Contracts.Requests;

public class SecureDeleteUserRequest
{
    public string AdminPassword { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
}
