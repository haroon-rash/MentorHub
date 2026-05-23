using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UserManagment.API.Contracts;
using UserManagment.API.Extensions;
using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Interfaces;

namespace UserManagment.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/tutor-onboarding")]
public class TutorOnboardingController : ControllerBase
{
    private readonly ITutorOnboardingService _tutorOnboardingService;

    public TutorOnboardingController(ITutorOnboardingService tutorOnboardingService)
    {
        _tutorOnboardingService = tutorOnboardingService;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyTutorProfile(CancellationToken cancellationToken)
    {
        if (!HttpContext.IsTutor() && !HttpContext.IsAdmin()) return Forbid();

        var authUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrWhiteSpace(authUserId))
        {
            return Unauthorized(ApiResponse<TutorProfileResponse>.Fail("Missing auth user id"));
        }

        var profile = await _tutorOnboardingService.GetTutorProfileAsync(authUserId, cancellationToken);

        if (profile == null)
        {
            return NotFound(ApiResponse<TutorProfileResponse>.Fail("Tutor profile not found"));
        }

        return Ok(ApiResponse<TutorProfileResponse>.Ok(profile));
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpsertMyTutorProfile([FromBody] TutorOnboardingRequest request, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsTutor() && !HttpContext.IsAdmin()) return Forbid();

        var authUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrWhiteSpace(authUserId))
        {
            return Unauthorized(ApiResponse<TutorProfileResponse>.Fail("Missing auth user id"));
        }

        var existingProfile = await _tutorOnboardingService.GetTutorProfileAsync(authUserId, cancellationToken);
        if (existingProfile != null && existingProfile.VerificationStatus != "Pending" && existingProfile.VerificationStatus != "Rejected")
        {
            return BadRequest(ApiResponse<TutorProfileResponse>.Fail("Approved tutors cannot modify their profile. Contact support for updates."));
        }

        try
        {
            var authEmail = HttpContext.GetAuthEmail() ?? string.Empty;
            var response = await _tutorOnboardingService.UpsertTutorProfileAsync(
                authUserId, authEmail, request, cancellationToken);
            return Ok(ApiResponse<TutorProfileResponse>.Ok(response, "Tutor profile submitted for verification"));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<TutorProfileResponse>.Fail(
                $"Could not save tutor profile: {ex.Message}"));
        }
    }
}
