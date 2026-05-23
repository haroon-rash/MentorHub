using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UserManagment.API.Contracts;
using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Interfaces;
using UserManagment.API.Extensions;

namespace UserManagment.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/course-assignments")]
public class CourseAssignmentsController : ControllerBase
{
    private readonly ICourseAssignmentService _assignmentService;

    public CourseAssignmentsController(ICourseAssignmentService assignmentService) => _assignmentService = assignmentService;

    private string? AuthUserId() => HttpContext.GetAuthUserId();

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCourseAssignmentRequest request, CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveTutor() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var created = await _assignmentService.CreateAsync(authUserId, request, cancellationToken);
            return Ok(ApiResponse<object>.Ok(created, "Assignment published."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{assignmentId:guid}")]
    public async Task<IActionResult> Update(Guid assignmentId, [FromBody] UpdateCourseAssignmentRequest request, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var updated = await _assignmentService.UpdateAsync(authUserId, assignmentId, request, cancellationToken);
            return Ok(ApiResponse<object>.Ok(updated, "Assignment updated."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{assignmentId:guid}/extend-deadline")]
    public async Task<IActionResult> ExtendDeadline(Guid assignmentId, [FromBody] ExtendAssignmentDeadlineRequest request, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var updated = await _assignmentService.ExtendDeadlineAsync(authUserId, assignmentId, request, cancellationToken);
            return Ok(ApiResponse<object>.Ok(updated, "Deadline extended."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{assignmentId:guid}/reject")]
    public async Task<IActionResult> Reject(Guid assignmentId, [FromBody] AssignmentActionRequest request, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var updated = await _assignmentService.RejectAsync(authUserId, assignmentId, request, cancellationToken);
            return Ok(ApiResponse<object>.Ok(updated, "Assignment rejected."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{assignmentId:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid assignmentId, [FromBody] AssignmentActionRequest request, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var updated = await _assignmentService.CancelAsync(authUserId, assignmentId, request, cancellationToken);
            return Ok(ApiResponse<object>.Ok(updated, "Assignment cancelled."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{assignmentId:guid}/archive")]
    public async Task<IActionResult> Archive(Guid assignmentId, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var updated = await _assignmentService.ArchiveAsync(authUserId, assignmentId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(updated, "Assignment archived."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{assignmentId:guid}/republish")]
    public async Task<IActionResult> Republish(Guid assignmentId, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var updated = await _assignmentService.RepublishAsync(authUserId, assignmentId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(updated, "Assignment republished."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("tutor")]
    public async Task<IActionResult> GetForTutor(CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveTutor() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        var items = await _assignmentService.GetForTutorAsync(authUserId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(items));
    }

    [HttpGet("student")]
    public async Task<IActionResult> GetForStudent(CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveStudent() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        var items = await _assignmentService.GetForStudentAsync(authUserId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(items));
    }

    [HttpGet("submissions")]
    public async Task<IActionResult> QuerySubmissions([FromQuery] SubmissionQueryRequest query, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var result = await _assignmentService.QuerySubmissionsAsync(authUserId, query, cancellationToken);
            return Ok(ApiResponse<object>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("submissions/{submissionId:guid}")]
    public async Task<IActionResult> GetSubmissionDetail(Guid submissionId, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var sub = await _assignmentService.GetSubmissionDetailAsync(authUserId, submissionId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(sub));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{assignmentId:guid}/submit")]
    public async Task<IActionResult> Submit(Guid assignmentId, [FromBody] SubmitAssignmentRequest request, CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveStudent() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var sub = await _assignmentService.SubmitAsync(authUserId, assignmentId, request, cancellationToken);
            return Ok(ApiResponse<object>.Ok(sub, "Submission received."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{assignmentId:guid}/submissions")]
    public async Task<IActionResult> GetSubmissions(Guid assignmentId, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var subs = await _assignmentService.GetSubmissionsForAssignmentAsync(authUserId, assignmentId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(subs));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("submissions/{submissionId:guid}/grade")]
    public async Task<IActionResult> Grade(Guid submissionId, [FromBody] GradeSubmissionRequest request, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var graded = await _assignmentService.GradeAsync(authUserId, submissionId, request, cancellationToken);
            return Ok(ApiResponse<object>.Ok(graded, "Submission graded."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
