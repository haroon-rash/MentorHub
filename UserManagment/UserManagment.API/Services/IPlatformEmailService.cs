namespace UserManagment.API.Services;

public interface IPlatformEmailService
{
    Task SendAsync(string toEmail, string subject, string body, CancellationToken cancellationToken = default);

    Task SendAsync(IEnumerable<string> toEmails, string subject, string body, CancellationToken cancellationToken = default);
}
