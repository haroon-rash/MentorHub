using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserManagment.API.Contracts;
using UserManagment.API.Extensions;
using UserManagment.API.Services;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.API.Controllers;

[ApiController]
[Route("api/v1/super-admin/communications")]
public class AdminCommunicationsController(UserManagmentDbContext context, IPlatformEmailService emailService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetHistory(CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();

        var history = await context.AdminCommunications.AsNoTracking()
            .OrderByDescending(c => c.SentAtUtc)
            .Take(100)
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<object>.Ok(history));
    }

    [HttpPost("send")]
    public async Task<IActionResult> Send([FromBody] AdminCommunicationRequest request, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();

        var adminId = HttpContext.GetAuthUserId() ?? "admin";
        var recipients = await ResolveRecipientsAsync(request, cancellationToken);
        var recipientEmails = await ResolveRecipientEmailsAsync(request, cancellationToken);

        foreach (var recipient in recipients)
        {
            context.Notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                RecipientAuthUserId = recipient,
                Type = NotificationType.General,
                Title = request.Subject.Trim(),
                Message = request.Body.Trim(),
                CreatedAtUtc = DateTime.UtcNow,
                IsRead = false
            });
        }

        var record = new AdminCommunication
        {
            Subject = request.Subject.Trim(),
            Body = request.Body.Trim(),
            Audience = request.Audience?.Trim().ToUpperInvariant() ?? "ALL",
            TargetAuthUserId = request.TargetAuthUserId,
            AttachmentUrl = request.AttachmentUrl,
            SentByAdminId = adminId,
            SentByAdminName = request.SentByAdminName ?? adminId,
            RecipientCount = recipients.Count,
            SentAtUtc = DateTime.UtcNow
        };

        context.AdminCommunications.Add(record);
        await context.SaveChangesAsync(cancellationToken);

        if (recipientEmails.Count > 0)
        {
            try
            {
                await emailService.SendAsync(
                    recipientEmails,
                    request.Subject.Trim(),
                    $"{request.Body.Trim()}\n\n— MentorHub",
                    cancellationToken);
            }
            catch
            {
                // In-app notifications already saved; email failure should not roll back.
            }
        }

        return Ok(ApiResponse<AdminCommunication>.Ok(record, $"Message sent to {recipients.Count} recipient(s)"));
    }

    private async Task<List<string>> ResolveRecipientsAsync(AdminCommunicationRequest request, CancellationToken cancellationToken)
    {
        var audience = request.Audience?.Trim().ToUpperInvariant() ?? "ALL";

        if (request.TargetAuthUserIds is { Count: > 0 })
        {
            return request.TargetAuthUserIds
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Select(id => id.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        if (request.TargetEmails is { Count: > 0 })
        {
            return await ResolveAuthUserIdsByEmailsAsync(request.TargetEmails, cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(request.TargetEmail))
        {
            var email = request.TargetEmail.Trim().ToLowerInvariant();
            var user = await context.UserAccounts.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email, cancellationToken);
            return user != null ? [user.AuthUserId] : [];
        }

        if (!string.IsNullOrWhiteSpace(request.TargetAuthUserId))
        {
            return [request.TargetAuthUserId.Trim()];
        }

        if (audience == "STUDENTS")
        {
            return await context.UserAccounts.AsNoTracking()
                .Where(u => u.Role == PlatformUserRole.Student)
                .Select(u => u.AuthUserId)
                .ToListAsync(cancellationToken);
        }

        if (audience == "TUTORS")
        {
            return await context.UserAccounts.AsNoTracking()
                .Where(u => u.Role == PlatformUserRole.Tutor)
                .Select(u => u.AuthUserId)
                .ToListAsync(cancellationToken);
        }

        return await context.UserAccounts.AsNoTracking()
            .Select(u => u.AuthUserId)
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    private async Task<List<string>> ResolveRecipientEmailsAsync(AdminCommunicationRequest request, CancellationToken cancellationToken)
    {
        var audience = request.Audience?.Trim().ToUpperInvariant() ?? "ALL";

        if (request.TargetEmails is { Count: > 0 })
        {
            return request.TargetEmails
                .Where(e => !string.IsNullOrWhiteSpace(e))
                .Select(e => e.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        if (!string.IsNullOrWhiteSpace(request.TargetEmail))
        {
            return [request.TargetEmail.Trim()];
        }

        if (!string.IsNullOrWhiteSpace(request.TargetAuthUserId))
        {
            var email = await context.UserAccounts.AsNoTracking()
                .Where(u => u.AuthUserId == request.TargetAuthUserId.Trim())
                .Select(u => u.Email)
                .FirstOrDefaultAsync(cancellationToken);
            return string.IsNullOrWhiteSpace(email) ? [] : [email];
        }

        var query = context.UserAccounts.AsNoTracking();
        if (audience == "STUDENTS")
        {
            query = query.Where(u => u.Role == PlatformUserRole.Student);
        }
        else if (audience == "TUTORS")
        {
            query = query.Where(u => u.Role == PlatformUserRole.Tutor);
        }

        return await query.Select(u => u.Email).Distinct().ToListAsync(cancellationToken);
    }

    private async Task<List<string>> ResolveAuthUserIdsByEmailsAsync(IEnumerable<string> emails, CancellationToken cancellationToken)
    {
        var normalized = emails
            .Where(e => !string.IsNullOrWhiteSpace(e))
            .Select(e => e.Trim().ToLowerInvariant())
            .Distinct()
            .ToList();

        if (normalized.Count == 0) return [];

        var fromAccounts = await context.UserAccounts.AsNoTracking()
            .Where(u => normalized.Contains(u.Email.ToLower()))
            .Select(u => u.AuthUserId)
            .ToListAsync(cancellationToken);

        var foundEmails = await context.UserAccounts.AsNoTracking()
            .Where(u => normalized.Contains(u.Email.ToLower()))
            .Select(u => u.Email.ToLower())
            .ToListAsync(cancellationToken);

        var missing = normalized.Except(foundEmails).ToList();
        if (missing.Count == 0) return fromAccounts.Distinct().ToList();

        var signupIds = new List<string>();
        foreach (var email in missing)
        {
            var row = await context.Database
                .SqlQuery<SignupAuthRow>($"""
                    SELECT user_id::text AS "AuthUserId", lower(user_email) AS "Email"
                    FROM signup_user
                    WHERE lower(user_email) = {email}
                    LIMIT 1
                    """)
                .FirstOrDefaultAsync(cancellationToken);
            if (row != null && !string.IsNullOrWhiteSpace(row.AuthUserId))
            {
                signupIds.Add(row.AuthUserId);
            }
        }

        return fromAccounts
            .Concat(signupIds)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private sealed class SignupAuthRow
    {
        public string AuthUserId { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
    }
}

public class AdminCommunicationRequest
{
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? Audience { get; set; }
    public string? TargetAuthUserId { get; set; }
    public string? TargetEmail { get; set; }
    public List<string>? TargetEmails { get; set; }
    public List<string>? TargetAuthUserIds { get; set; }
    public string? AttachmentUrl { get; set; }
    public string? SentByAdminName { get; set; }
}
