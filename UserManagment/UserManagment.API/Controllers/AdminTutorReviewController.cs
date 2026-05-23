using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UserManagment.API.Contracts;
using UserManagment.API.Extensions;
using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Interfaces;

namespace UserManagment.API.Controllers;

[Authorize(Roles = "ADMIN")]
[ApiController]
[Route("api/v1/admin/tutors")]
public class AdminTutorReviewController : ControllerBase
{
    private readonly ISuperAdminVerificationService _superAdminVerificationService;

    public AdminTutorReviewController(ISuperAdminVerificationService superAdminVerificationService)
    {
        _superAdminVerificationService = superAdminVerificationService;
    }

    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> ApproveTutor(Guid id, [FromBody] TutorReviewActionRequest request, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsAdmin()) return Forbid();

        var adminId = HttpContext.GetAuthUserId();
        if (string.IsNullOrWhiteSpace(adminId))
        {
            return Unauthorized(ApiResponse<string>.Fail("Missing auth user id"));
        }

        var decision = new TutorVerificationDecisionRequest
        {
            Approve = true,
            Notes = request.Reason
        };

        var summary = await _superAdminVerificationService.ReviewTutorAsync(adminId, id, decision, cancellationToken);
        return Ok(ApiResponse<TutorRequestSummaryResponse>.Ok(summary, "Tutor approved successfully"));
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> RejectTutor(Guid id, [FromBody] TutorReviewActionRequest request, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsAdmin()) return Forbid();

        var adminId = HttpContext.GetAuthUserId();
        if (string.IsNullOrWhiteSpace(adminId))
        {
            return Unauthorized(ApiResponse<string>.Fail("Missing auth user id"));
        }

        var decision = new TutorVerificationDecisionRequest
        {
            Approve = false,
            Notes = request.Reason
        };

        var summary = await _superAdminVerificationService.ReviewTutorAsync(adminId, id, decision, cancellationToken);
        return Ok(ApiResponse<TutorRequestSummaryResponse>.Ok(summary, "Tutor rejected successfully"));
    }
}
