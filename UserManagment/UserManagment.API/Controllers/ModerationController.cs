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
[Route("api/v1/super-admin/moderation")]
public class ModerationController(
    UserManagmentDbContext context,
    IWarningNotifier warningNotifier) : ControllerBase
{
    [HttpGet("warnings")]
    public async Task<IActionResult> GetWarnings([FromQuery] string? authUserId, [FromQuery] bool includeHistory = true, CancellationToken cancellationToken = default)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();

        var query = context.UserWarnings.AsNoTracking().AsQueryable();
        if (!includeHistory)
        {
            query = query.Where(w => w.IsActive);
        }

        if (!string.IsNullOrWhiteSpace(authUserId))
        {
            query = query.Where(w => w.TargetAuthUserId == authUserId);
        }

        var warnings = await query.OrderByDescending(w => w.IssuedAtUtc).Take(500).ToListAsync(cancellationToken);
        return Ok(ApiResponse<object>.Ok(warnings.Select(MapWarning).ToArray()));
    }

    [HttpGet("warnings/{id:guid}")]
    public async Task<IActionResult> GetWarning(Guid id, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();

        var warning = await context.UserWarnings.AsNoTracking().FirstOrDefaultAsync(w => w.Id == id, cancellationToken);
        if (warning == null) return NotFound(ApiResponse<string>.Fail("Warning not found"));

        return Ok(ApiResponse<object>.Ok(MapWarning(warning)));
    }

    [HttpPost("warnings")]
    public async Task<IActionResult> IssueWarning([FromBody] WarningRequest request, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();

        var targetAuthUserId = await UserIdentityResolver.ResolveAuthUserIdAsync(
            context, request.TargetAuthUserId, request.TargetEmail, cancellationToken);
        if (string.IsNullOrWhiteSpace(targetAuthUserId))
        {
            return BadRequest(ApiResponse<string>.Fail("User not found. Provide a valid email or auth user id."));
        }

        var targetAccount = await context.UserAccounts.AsNoTracking()
            .FirstOrDefaultAsync(u => u.AuthUserId == targetAuthUserId, cancellationToken);
        var resolvedTargetRole = targetAccount?.Role switch
        {
            PlatformUserRole.Student => "STUDENT",
            PlatformUserRole.Tutor => "TUTOR",
            _ => request.TargetRole?.Trim() ?? "TUTOR"
        };

        var adminId = HttpContext.GetAuthUserId() ?? "admin";
        var initialStatus = string.Equals(request.InitialStatus, "Active", StringComparison.OrdinalIgnoreCase)
            ? WarningStatus.Active
            : WarningStatus.PendingReview;

        var warning = new UserWarning
        {
            TargetAuthUserId = targetAuthUserId,
            TargetRole = resolvedTargetRole,
            Category = request.Category.Trim(),
            Severity = request.Severity?.Trim() ?? "Medium",
            Notes = request.Notes?.Trim() ?? string.Empty,
            AttachmentUrl = request.AttachmentUrl,
            IssuedByAdminId = adminId,
            IssuedByAdminName = request.IssuedByAdminName ?? adminId,
            ExpiresAtUtc = request.ExpiresAtUtc,
            IssuedAtUtc = DateTime.UtcNow,
            IsActive = true,
            Status = initialStatus
        };

        context.UserWarnings.Add(warning);
        await context.SaveChangesAsync(cancellationToken);
        await warningNotifier.NotifyWarningEventAsync(warning, "issued", cancellationToken);

        return Ok(ApiResponse<object>.Ok(MapWarning(warning), "Warning issued"));
    }

    [HttpPost("warnings/{id:guid}/review")]
    public async Task<IActionResult> ReviewWarning(Guid id, [FromBody] WarningReviewRequest request, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();

        var warning = await context.UserWarnings.FirstOrDefaultAsync(w => w.Id == id, cancellationToken);
        if (warning == null) return NotFound(ApiResponse<string>.Fail("Warning not found"));

        var adminId = HttpContext.GetAuthUserId() ?? "admin";
        var action = request.Action?.Trim().ToUpperInvariant() ?? "";

        warning.ReviewedByAdminId = adminId;
        warning.ReviewedByAdminName = request.ReviewedByAdminName ?? adminId;
        warning.ReviewedAtUtc = DateTime.UtcNow;
        warning.ReviewNotes = request.ReviewNotes?.Trim();

        string eventType;
        switch (action)
        {
            case "APPROVE":
                warning.Status = WarningStatus.Approved;
                warning.IsActive = false;
                eventType = "approved";
                break;
            case "DISAPPROVE":
                warning.Status = WarningStatus.Disapproved;
                warning.IsActive = false;
                eventType = "disapproved";
                break;
            case "ACTIVATE":
                warning.Status = WarningStatus.Active;
                warning.IsActive = true;
                eventType = "activated";
                break;
            case "PENDING":
                warning.Status = WarningStatus.PendingReview;
                warning.IsActive = true;
                eventType = "issued";
                break;
            default:
                return BadRequest(ApiResponse<string>.Fail("Action must be Approve, Disapprove, Activate, or Pending"));
        }

        await context.SaveChangesAsync(cancellationToken);
        await warningNotifier.NotifyWarningEventAsync(warning, eventType, cancellationToken);

        return Ok(ApiResponse<object>.Ok(MapWarning(warning), "Warning reviewed"));
    }

    [HttpGet("restrictions")]
    public async Task<IActionResult> GetRestrictions([FromQuery] string? authUserId, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();

        var now = DateTime.UtcNow;
        var query = context.AccountRestrictions.AsNoTracking()
            .Where(r => r.IsActive && (r.ExpiresAtUtc == null || r.ExpiresAtUtc > now));

        if (!string.IsNullOrWhiteSpace(authUserId))
        {
            query = query.Where(r => r.TargetAuthUserId == authUserId);
        }

        var restrictions = await query.OrderByDescending(r => r.CreatedAtUtc).Take(200).ToListAsync(cancellationToken);
        return Ok(ApiResponse<object>.Ok(restrictions));
    }

    [HttpPost("restrictions")]
    public async Task<IActionResult> ApplyRestriction([FromBody] RestrictionRequest request, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();

        var targetAuthUserId = await UserIdentityResolver.ResolveAuthUserIdAsync(
            context, request.TargetAuthUserId, request.TargetEmail, cancellationToken);
        if (string.IsNullOrWhiteSpace(targetAuthUserId))
        {
            return BadRequest(ApiResponse<string>.Fail("User not found. Provide a valid email or auth user id."));
        }

        var adminId = HttpContext.GetAuthUserId() ?? "admin";
        var restriction = new AccountRestriction
        {
            TargetAuthUserId = targetAuthUserId,
            RestrictionType = request.RestrictionType.Trim().ToUpperInvariant(),
            Reason = request.Reason?.Trim() ?? string.Empty,
            IssuedByAdminId = adminId,
            StartsAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = request.ExpiresAtUtc,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        context.AccountRestrictions.Add(restriction);
        await context.SaveChangesAsync(cancellationToken);

        context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            RecipientAuthUserId = restriction.TargetAuthUserId,
            Type = NotificationType.General,
            Title = "Account Restriction",
            Message = $"A {restriction.RestrictionType} restriction was applied. {restriction.Reason}",
            RelatedEntityId = restriction.Id,
            CreatedAtUtc = DateTime.UtcNow,
            IsRead = false
        });
        await context.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse<AccountRestriction>.Ok(restriction, "Restriction applied"));
    }

    [HttpPost("restrictions/{id:guid}/revoke")]
    public async Task<IActionResult> RevokeRestriction(Guid id, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();

        var restriction = await context.AccountRestrictions.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (restriction == null) return NotFound(ApiResponse<string>.Fail("Restriction not found"));

        restriction.IsActive = false;
        restriction.RevokedAtUtc = DateTime.UtcNow;
        await context.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse<object>.Ok(null, "Restriction revoked"));
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats(CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();

        var now = DateTime.UtcNow;
        var pendingReview = await context.UserWarnings.CountAsync(
            w => w.Status == WarningStatus.PendingReview && w.IsActive, cancellationToken);
        var activeWarnings = await context.UserWarnings.CountAsync(
            w => w.Status == WarningStatus.Active && w.IsActive && (w.ExpiresAtUtc == null || w.ExpiresAtUtc > now), cancellationToken);
        var activeRestrictions = await context.AccountRestrictions.CountAsync(
            r => r.IsActive && (r.ExpiresAtUtc == null || r.ExpiresAtUtc > now), cancellationToken);

        return Ok(ApiResponse<object>.Ok(new { pendingReview, activeWarnings, activeRestrictions }));
    }

    private static object MapWarning(UserWarning w) => new
    {
        w.Id,
        w.TargetAuthUserId,
        w.TargetRole,
        w.Category,
        w.Severity,
        w.Notes,
        w.AttachmentUrl,
        w.IssuedByAdminId,
        w.IssuedByAdminName,
        w.IssuedAtUtc,
        w.ExpiresAtUtc,
        w.IsActive,
        Status = w.Status.ToString(),
        w.DefenseMessage,
        w.DefenseAttachmentUrl,
        w.DefenseSubmittedAtUtc,
        w.ReviewedByAdminId,
        w.ReviewedByAdminName,
        w.ReviewedAtUtc,
        w.ReviewNotes
    };
}

public class WarningRequest
{
    public string TargetAuthUserId { get; set; } = string.Empty;
    public string? TargetEmail { get; set; }
    public string? TargetRole { get; set; }
    public string Category { get; set; } = string.Empty;
    public string? Severity { get; set; }
    public string? Notes { get; set; }
    public string? AttachmentUrl { get; set; }
    public string? IssuedByAdminName { get; set; }
    public string? InitialStatus { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
}

public class WarningReviewRequest
{
    public string Action { get; set; } = string.Empty;
    public string? ReviewNotes { get; set; }
    public string? ReviewedByAdminName { get; set; }
}

public class RestrictionRequest
{
    public string TargetAuthUserId { get; set; } = string.Empty;
    public string? TargetEmail { get; set; }
    public string RestrictionType { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
}
