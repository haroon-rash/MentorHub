using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UserManagment.API.Extensions;
using UserManagment.Application.Interfaces;

namespace UserManagment.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/tutor-students")]
public class TutorStudentsController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public TutorStudentsController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [HttpGet("{tutorProfileId:guid}/students")]
    public async Task<IActionResult> GetStudents(Guid tutorProfileId, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsTutor()) return Forbid();

        var authUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrWhiteSpace(authUserId)) return Unauthorized();

        try
        {
            var students = await _bookingService.GetTutorStudentSummariesAsync(tutorProfileId, authUserId, cancellationToken);
            return Ok(new { success = true, data = students });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
