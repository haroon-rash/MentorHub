using Microsoft.EntityFrameworkCore;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.API.Services;

public interface IWarningNotifier
{
    Task NotifyWarningEventAsync(UserWarning warning, string eventType, CancellationToken cancellationToken);
}

public class WarningNotifier(UserManagmentDbContext context, IPlatformEmailService emailService) : IWarningNotifier
{
    public async Task NotifyWarningEventAsync(UserWarning warning, string eventType, CancellationToken cancellationToken)
    {
        var title = eventType switch
        {
            "issued" => "Account Warning Issued",
            "defense" => "Tutor Submitted Warning Defense",
            "approved" => "Warning Review: Approved",
            "disapproved" => "Warning Review: Disapproved",
            "activated" => "Warning Marked Active",
            _ => "Account Warning Update"
        };

        var message = eventType switch
        {
            "issued" => $"You received a {warning.Severity} warning for {warning.Category}. Please review and submit a defense if needed.",
            "defense" => "Your defense has been submitted and is pending admin review.",
            "approved" => "An admin approved the warning review. It is now closed in your history.",
            "disapproved" => "An admin disapproved the warning. It will appear in your disapproved notices.",
            "activated" => "An admin marked your warning as active. Please comply with platform policies.",
            _ => warning.Notes
        };

        context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            RecipientAuthUserId = warning.TargetAuthUserId,
            Type = NotificationType.General,
            Title = title,
            Message = message,
            RelatedEntityId = warning.Id,
            CreatedAtUtc = DateTime.UtcNow,
            IsRead = false
        });

        await context.SaveChangesAsync(cancellationToken);

        var user = await context.UserAccounts.AsNoTracking()
            .FirstOrDefaultAsync(u => u.AuthUserId == warning.TargetAuthUserId, cancellationToken);

        if (user != null && !string.IsNullOrWhiteSpace(user.Email))
        {
            try
            {
                await emailService.SendAsync(
                    user.Email,
                    $"MentorHub — {title}",
                    $"{message}\n\nCategory: {warning.Category}\nSeverity: {warning.Severity}\n\n— MentorHub Trust & Safety",
                    cancellationToken);
            }
            catch
            {
                // Email publish must not block warning workflow.
            }
        }
    }
}
