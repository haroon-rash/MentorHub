using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using UserManagment.API.Contracts;
using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Interfaces;
using UserManagment.API.Extensions;

namespace UserManagment.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/enrollments")]
public class BatchEnrollmentsController : ControllerBase
{
    private readonly IBatchEnrollmentService _enrollmentService;
    private readonly IEnrollmentBillingService _billingService;
    private readonly IEnrollmentCompletionService _completionService;
    private readonly IReviewEligibilityService _reviewEligibilityService;

    public BatchEnrollmentsController(
        IBatchEnrollmentService enrollmentService,
        IEnrollmentBillingService billingService,
        IEnrollmentCompletionService completionService,
        IReviewEligibilityService reviewEligibilityService)
    {
        _enrollmentService = enrollmentService;
        _billingService = billingService;
        _completionService = completionService;
        _reviewEligibilityService = reviewEligibilityService;
    }

    private string? AuthUserId() => HttpContext.GetAuthUserId();

    [HttpPost("batch/{batchId:guid}")]
    public async Task<IActionResult> EnrollInBatch(Guid batchId, [FromBody] EnrollInBatchRequest request, CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveStudent() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var enrollment = await _enrollmentService.EnrollInBatchAsync(authUserId, batchId, request, cancellationToken);
            return Ok(ApiResponse<object>.Ok(enrollment, "Enrolled successfully. Class sessions are scheduled for your package period."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("package")]
    public async Task<IActionResult> EnrollPackage([FromBody] CreatePackageEnrollmentRequest request, CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveStudent() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var enrollment = await _enrollmentService.EnrollInPackageAsync(authUserId, request, cancellationToken);
            return Ok(ApiResponse<object>.Ok(enrollment, "Package enrollment created."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var list = await _enrollmentService.GetMyEnrollmentsAsync(authUserId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(list));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("tutor")]
    public async Task<IActionResult> GetTutorEnrollments([FromQuery] Guid? batchId, CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveTutor() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var list = await _enrollmentService.GetTutorEnrollmentsAsync(authUserId, batchId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(list));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("can-enroll-batch")]
    public async Task<IActionResult> CanEnrollBatch([FromQuery] Guid batchId, CancellationToken cancellationToken = default)
    {
        if (HttpContext.ForbidUnlessActiveStudent() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        var studentRepo = HttpContext.RequestServices.GetRequiredService<IStudentProfileRepository>();
        var student = await studentRepo.GetByAuthUserIdAsync(authUserId, cancellationToken);
        if (student is null) return NotFound(new { message = "Student profile not found." });

        var eligibility = await _enrollmentService.CanEnrollInBatchAsync(student.Id, batchId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new
        {
            canEnroll = eligibility.CanEnroll,
            message = eligibility.Message,
        }));
    }

    [HttpGet("can-enroll")]
    public async Task<IActionResult> CanEnroll(
        [FromQuery] Guid tutorProfileId,
        [FromQuery] string subject,
        [FromQuery] DateTime startDateUtc,
        [FromQuery] int planMonths = 1,
        [FromQuery] string? daysOfWeekCsv = null,
        [FromQuery] string? startTime = null,
        [FromQuery] string? endTime = null,
        CancellationToken cancellationToken = default)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        var studentRepo = HttpContext.RequestServices.GetRequiredService<IStudentProfileRepository>();
        var student = await studentRepo.GetByAuthUserIdAsync(authUserId, cancellationToken);
        if (student is null) return NotFound(new { message = "Student profile not found." });

        var start = DateTime.SpecifyKind(startDateUtc.Date, DateTimeKind.Utc);
        var end = start.AddMonths(Math.Max(1, planMonths));
        var eligibility = await _enrollmentService.CanEnrollAsync(
            student.Id,
            tutorProfileId,
            subject,
            start,
            end,
            daysOfWeekCsv ?? "Monday,Wednesday,Friday",
            startTime ?? "17:00",
            endTime ?? "18:00",
            cancellationToken);

        return Ok(ApiResponse<object>.Ok(new
        {
            canEnroll = eligibility.CanEnroll,
            message = eligibility.Message,
        }));
    }

    [HttpGet("tutor/student/{studentProfileId:guid}")]
    public async Task<IActionResult> GetStudentDetail(
        Guid studentProfileId, [FromQuery] Guid? batchId, CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveTutor() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var detail = await _enrollmentService.GetEnrolledStudentDetailAsync(authUserId, studentProfileId, batchId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(detail));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{enrollmentId:guid}/billing-periods")]
    public async Task<IActionResult> GetBillingPeriods(Guid enrollmentId, CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveStudentOrTutor() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var periods = await _billingService.GetBillingPeriodsAsync(
                authUserId, enrollmentId, HttpContext.GetUserRole()!, cancellationToken);
            return Ok(ApiResponse<object>.Ok(periods));
        }
        catch (Exception ex) when (ex is InvalidOperationException or UnauthorizedAccessException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{enrollmentId:guid}/withdraw/preview")]
    public async Task<IActionResult> PreviewWithdraw(
        Guid enrollmentId, [FromBody] WithdrawEnrollmentRequest request, CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveStudent() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var preview = await _billingService.PreviewWithdrawalAsync(
                authUserId, enrollmentId, request.RequestedLeaveDateUtc, HttpContext.GetUserRole()!, cancellationToken);
            return Ok(ApiResponse<object>.Ok(preview));
        }
        catch (Exception ex) when (ex is InvalidOperationException or UnauthorizedAccessException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{enrollmentId:guid}/withdraw")]
    public async Task<IActionResult> ConfirmWithdraw(
        Guid enrollmentId, [FromBody] WithdrawEnrollmentRequest request, CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveStudent() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var result = await _billingService.ConfirmWithdrawalAsync(
                authUserId, enrollmentId, request, HttpContext.GetUserRole()!, cancellationToken);
            return Ok(ApiResponse<object>.Ok(result, "Early leave recorded. Billing ledger updated (no payment processed)."));
        }
        catch (Exception ex) when (ex is InvalidOperationException or UnauthorizedAccessException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{enrollmentId:guid}/complete")]
    public async Task<IActionResult> Complete(Guid enrollmentId, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            await _completionService.CompleteEnrollmentAsync(authUserId, enrollmentId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(null, "Enrollment marked as completed."));
        }
        catch (Exception ex) when (ex is InvalidOperationException or UnauthorizedAccessException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{enrollmentId:guid}/review-eligibility")]
    public async Task<IActionResult> ReviewEligibility(Guid enrollmentId, CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveStudent() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var eligibility = await _reviewEligibilityService.GetEnrollmentReviewEligibilityAsync(
                authUserId, enrollmentId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(eligibility));
        }
        catch (Exception ex) when (ex is InvalidOperationException or UnauthorizedAccessException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("review-prompts")]
    public async Task<IActionResult> ReviewPrompts(CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveStudent() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var prompts = await _reviewEligibilityService.GetPendingReviewPromptsAsync(authUserId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(prompts));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{enrollmentId:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid enrollmentId, [FromBody] string? reason, CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveStudentOrTutor() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            await _enrollmentService.CancelEnrollmentAsync(
                authUserId, enrollmentId, reason, HttpContext.GetUserRole()!, cancellationToken);
            return Ok(ApiResponse<object>.Ok(null, "Enrollment cancelled."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
