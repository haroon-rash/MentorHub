using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserManagment.API.Contracts;
using UserManagment.API.Extensions;
using UserManagment.API.Services;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Enums;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/warnings")]
[RequestSizeLimit(10 * 1024 * 1024)]
public class WarningsController(
    UserManagmentDbContext context,
    IWarningNotifier warningNotifier,
    IFileService fileService) : ControllerBase
{
  private const long MaxFileBytes = 10 * 1024 * 1024;

  [HttpGet("my")]
  public async Task<IActionResult> GetMyWarnings(CancellationToken cancellationToken)
  {
    var authUserId = HttpContext.GetAuthUserId();
    if (string.IsNullOrWhiteSpace(authUserId))
    {
      return Unauthorized(ApiResponse<string>.Fail("Unauthorized"));
    }

    var warnings = await context.UserWarnings.AsNoTracking()
      .Where(w => w.TargetAuthUserId == authUserId)
      .OrderByDescending(w => w.IssuedAtUtc)
      .ToListAsync(cancellationToken);

    return Ok(ApiResponse<object>.Ok(warnings.Select(MapWarning).ToArray()));
  }

  [HttpGet("my/banner")]
  public async Task<IActionResult> GetBannerWarning(CancellationToken cancellationToken)
  {
    var authUserId = HttpContext.GetAuthUserId();
    if (string.IsNullOrWhiteSpace(authUserId))
    {
      return Unauthorized(ApiResponse<string>.Fail("Unauthorized"));
    }

    var now = DateTime.UtcNow;
    var accountRole = await context.UserAccounts.AsNoTracking()
      .Where(u => u.AuthUserId == authUserId)
      .Select(u => u.Role)
      .FirstOrDefaultAsync(cancellationToken);
    var expectedRole = accountRole == PlatformUserRole.Student ? "STUDENT" : "TUTOR";

    var banner = await context.UserWarnings.AsNoTracking()
      .Where(w => w.TargetAuthUserId == authUserId
                  && w.TargetRole == expectedRole
                  && (w.Status == WarningStatus.PendingReview || w.Status == WarningStatus.Active)
                  && w.IsActive
                  && (w.ExpiresAtUtc == null || w.ExpiresAtUtc > now))
      .OrderByDescending(w => w.IssuedAtUtc)
      .FirstOrDefaultAsync(cancellationToken);

    return Ok(ApiResponse<object?>.Ok(banner == null ? null : MapWarning(banner)));
  }

  [HttpPost("{id:guid}/defense")]
  [Consumes("application/json", "multipart/form-data")]
  public async Task<IActionResult> SubmitDefense(Guid id, CancellationToken cancellationToken)
  {
    var authUserId = HttpContext.GetAuthUserId();
    if (string.IsNullOrWhiteSpace(authUserId))
    {
      return Unauthorized(ApiResponse<string>.Fail("Unauthorized"));
    }

    var warning = await context.UserWarnings.FirstOrDefaultAsync(w => w.Id == id, cancellationToken);
    if (warning == null || warning.TargetAuthUserId != authUserId)
    {
      return NotFound(ApiResponse<string>.Fail("Warning not found"));
    }

    if (warning.Status is WarningStatus.Approved or WarningStatus.Disapproved)
    {
      return BadRequest(ApiResponse<string>.Fail("This warning is already closed"));
    }

    string message;
    string? attachmentUrl;

    if (Request.HasFormContentType)
    {
      var form = await Request.ReadFormAsync(cancellationToken);
      message = form["message"].ToString().Trim();
      attachmentUrl = form["attachmentUrl"].ToString();
      if (string.IsNullOrWhiteSpace(attachmentUrl))
      {
        attachmentUrl = null;
      }

      var file = form.Files.GetFile("file");
      if (file != null && file.Length > 0)
      {
        if (file.Length > MaxFileBytes)
        {
          return BadRequest(ApiResponse<string>.Fail("File exceeds the 10 MB limit."));
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx" };
        if (!allowed.Contains(extension))
        {
          return BadRequest(ApiResponse<string>.Fail("Invalid file type."));
        }

        await using var stream = file.OpenReadStream();
        attachmentUrl = await fileService.SaveFileAsync(stream, file.FileName, "documents", cancellationToken);
      }
    }
    else
    {
      var request = await Request.ReadFromJsonAsync<WarningDefenseRequest>(cancellationToken);
      message = request?.Message?.Trim() ?? string.Empty;
      attachmentUrl = request?.AttachmentUrl;
    }

    if (string.IsNullOrWhiteSpace(message))
    {
      return BadRequest(ApiResponse<string>.Fail("Defense message is required."));
    }

    warning.DefenseMessage = message;
    warning.DefenseAttachmentUrl = attachmentUrl;
    warning.DefenseSubmittedAtUtc = DateTime.UtcNow;
    warning.Status = WarningStatus.PendingReview;

    await context.SaveChangesAsync(cancellationToken);

    try
    {
      await warningNotifier.NotifyWarningEventAsync(warning, "defense", cancellationToken);
    }
    catch
    {
      // Notification failures must not block a saved defense.
    }

    return Ok(ApiResponse<object>.Ok(MapWarning(warning), "Defense submitted"));
  }

  private static object MapWarning(Domain.Entities.UserWarning w) => new
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

public class WarningDefenseRequest
{
  public string? Message { get; set; }
  public string? AttachmentUrl { get; set; }
}
