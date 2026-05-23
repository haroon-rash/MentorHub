using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UserManagment.Application.Interfaces;

namespace UserManagment.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    private string? GetAuthUserId() => User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    [HttpGet]
    public async Task<IActionResult> GetNotifications(CancellationToken cancellationToken)
    {
        var authUserId = GetAuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        var notifications = await _notificationService.GetForUserAsync(authUserId, cancellationToken);
        var unreadCount = await _notificationService.GetUnreadCountAsync(authUserId, cancellationToken);

        return Ok(new { notifications, unreadCount });
    }

    [HttpPatch("{id}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken cancellationToken)
    {
        var authUserId = GetAuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        try
        {
            await _notificationService.MarkReadAsync(id, authUserId, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        var authUserId = GetAuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        await _notificationService.MarkAllReadAsync(authUserId, cancellationToken);
        return NoContent();
    }
}
