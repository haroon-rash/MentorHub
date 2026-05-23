using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace UserManagment.API.Services;

public class PlatformEmailService(IOptions<PlatformEmailOptions> options, ILogger<PlatformEmailService> logger)
    : IPlatformEmailService
{
    private readonly PlatformEmailOptions _options = options.Value;

    public Task SendAsync(string toEmail, string subject, string body, CancellationToken cancellationToken = default) =>
        SendAsync([toEmail], subject, body, cancellationToken);

    public async Task SendAsync(
        IEnumerable<string> toEmails,
        string subject,
        string body,
        CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
        {
            logger.LogDebug("Platform email disabled; skipped send for subject {Subject}", subject);
            return;
        }

        var recipients = toEmails
            .Where(e => !string.IsNullOrWhiteSpace(e))
            .Select(e => e.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (recipients.Count == 0)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(_options.Username) || string.IsNullOrWhiteSpace(_options.Password))
        {
            logger.LogWarning("Platform SMTP credentials are not configured; email not sent.");
            return;
        }

        using var client = new SmtpClient(_options.Host, _options.Port)
        {
            Credentials = new NetworkCredential(_options.Username, _options.Password),
            EnableSsl = _options.UseStartTls,
            DeliveryMethod = SmtpDeliveryMethod.Network,
        };

        using var message = new MailMessage
        {
            From = new MailAddress(_options.From, _options.FromDisplayName),
            Subject = subject,
            Body = body,
            IsBodyHtml = false,
        };

        foreach (var recipient in recipients)
        {
            message.To.Add(recipient);
        }

        try
        {
            await client.SendMailAsync(message, cancellationToken);
            logger.LogInformation("Platform email sent to {Recipients} — {Subject}", string.Join(", ", recipients), subject);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send platform email to {Recipients}", string.Join(", ", recipients));
            throw;
        }
    }
}
