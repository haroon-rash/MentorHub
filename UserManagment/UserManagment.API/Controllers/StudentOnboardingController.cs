using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserManagment.API.Contracts;
using UserManagment.API.Extensions;
using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Interfaces;

namespace UserManagment.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/student-onboarding")]
public class StudentOnboardingController : ControllerBase
{
    private readonly IStudentOnboardingService _studentOnboardingService;
    private readonly ILogger<StudentOnboardingController> _logger;

    public StudentOnboardingController(
        IStudentOnboardingService studentOnboardingService,
        ILogger<StudentOnboardingController> logger)
    {
        _studentOnboardingService = studentOnboardingService;
        _logger = logger;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyStudentProfile(CancellationToken cancellationToken)
    {
        if (!HttpContext.IsStudent() && !HttpContext.IsSuperAdmin())
        {
            return Forbid();
        }

        var authUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrWhiteSpace(authUserId))
        {
            return Unauthorized(ApiResponse<StudentProfileResponse>.Fail("Missing auth user id"));
        }

        var profile = await _studentOnboardingService.GetStudentProfileAsync(authUserId, cancellationToken);
        if (profile == null)
        {
            return NotFound(ApiResponse<StudentProfileResponse>.Fail("Student profile not found"));
        }

        return Ok(ApiResponse<StudentProfileResponse>.Ok(profile));
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpsertMyStudentProfile([FromBody] StudentOnboardingRequest request, CancellationToken cancellationToken)
    {
        var authUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrWhiteSpace(authUserId))
        {
            return Unauthorized(ApiResponse<StudentProfileResponse>.Fail("Missing auth user id"));
        }

        if (!HttpContext.IsStudent() && !HttpContext.IsSuperAdmin())
        {
            return Forbid();
        }

        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v?.Errors ?? Enumerable.Empty<Microsoft.AspNetCore.Mvc.ModelBinding.ModelError>())
                .Select(e => e.ErrorMessage)
                .Where(m => !string.IsNullOrWhiteSpace(m))
                .ToArray();
            var message = errors.Length > 0 ? string.Join(" ", errors) : "Invalid profile data.";
            return BadRequest(ApiResponse<StudentProfileResponse>.Fail(message));
        }

        try
        {
            var response = await _studentOnboardingService.UpsertStudentProfileAsync(authUserId, request, cancellationToken);
            return Ok(ApiResponse<StudentProfileResponse>.Ok(response, "Student profile saved successfully"));
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error saving student profile for {AuthUserId}", authUserId);
            var detail = ex.InnerException?.Message ?? ex.Message;
            if (detail.Contains("duplicate", StringComparison.OrdinalIgnoreCase)
                || detail.Contains("unique", StringComparison.OrdinalIgnoreCase))
            {
                return Conflict(ApiResponse<StudentProfileResponse>.Fail(
                    "A profile with this email already exists. Use the same email you signed up with."));
            }

            return StatusCode(500, ApiResponse<StudentProfileResponse>.Fail(
                "Could not save student profile due to a database error. Please try again."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<StudentProfileResponse>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error saving student profile for {AuthUserId}", authUserId);
            return StatusCode(500, ApiResponse<StudentProfileResponse>.Fail(ex.Message));
        }
    }
}
