using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UserManagment.API.Contracts;
using UserManagment.API.Extensions;
using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Interfaces;

namespace UserManagment.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/sessions")]
public class SessionAttendanceController : ControllerBase
{
    private readonly ISessionAttendanceService _attendanceService;

    public SessionAttendanceController(ISessionAttendanceService attendanceService) =>
        _attendanceService = attendanceService;

    [HttpPost("attendance")]
    public async Task<IActionResult> RecordAttendance(
        [FromBody] RecordSessionAttendanceRequest request, CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveTutor() is { } forbid) return forbid;
        var authUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            await _attendanceService.RecordAttendanceAsync(authUserId, request, cancellationToken);
            return Ok(ApiResponse<object>.Ok(null, "Attendance recorded."));
        }
        catch (Exception ex) when (ex is InvalidOperationException or UnauthorizedAccessException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
