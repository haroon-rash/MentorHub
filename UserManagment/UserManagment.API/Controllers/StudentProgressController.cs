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
[Route("api/v1/student-progress")]
public class StudentProgressController : ControllerBase
{
    private readonly IStudentProgressService _progressService;
    private readonly IStudentProfileRepository _studentProfileRepository;
    private readonly ITutorProfileRepository _tutorProfileRepository;
    private readonly IBatchEnrollmentRepository _enrollmentRepository;

    public StudentProgressController(
        IStudentProgressService progressService,
        IStudentProfileRepository studentProfileRepository,
        ITutorProfileRepository tutorProfileRepository,
        IBatchEnrollmentRepository enrollmentRepository)
    {
        _progressService = progressService;
        _studentProfileRepository = studentProfileRepository;
        _tutorProfileRepository = tutorProfileRepository;
        _enrollmentRepository = enrollmentRepository;
    }

    private string? AuthUserId => HttpContext.GetAuthUserId();

    // ── GET /api/v1/student-progress  ──────────────────────────────────
    // Student fetches their own progress dashboard
    [HttpGet]
    public async Task<IActionResult> GetMyProgress(CancellationToken cancellationToken)
    {
        var forbidden = HttpContext.ForbidUnlessActiveStudent();
        if (forbidden is not null) return forbidden;

        var authUserId = AuthUserId;
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        var studentProfile = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
        if (studentProfile is null) return NotFound(new { message = "Student profile not found." });

        var progress = await _progressService.GetStudentProgressAsync(studentProfile.Id, cancellationToken);
        return Ok(ApiResponse<StudentProgressResponse>.Ok(progress));
    }

    // ── GET /api/v1/student-progress/{studentProfileId}  ──────────────
    // Tutor (with active enrollment) or Admin can fetch a specific student's progress.
    // A student can only fetch their own.
    [HttpGet("{studentProfileId:guid}")]
    public async Task<IActionResult> GetStudentProgress(Guid studentProfileId, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId;
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        if (HttpContext.IsAdmin() || HttpContext.IsSuperAdmin())
        {
            var progress = await _progressService.GetStudentProgressAsync(studentProfileId, cancellationToken);
            return Ok(ApiResponse<StudentProgressResponse>.Ok(progress));
        }

        if (HttpContext.IsStudent())
        {
            var ownProfile = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
            if (ownProfile is null || ownProfile.Id != studentProfileId)
            {
                return Forbid();
            }

            var progress = await _progressService.GetStudentProgressAsync(studentProfileId, cancellationToken);
            return Ok(ApiResponse<StudentProgressResponse>.Ok(progress));
        }

        if (HttpContext.IsTutor())
        {
            var tutorProfile = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
            if (tutorProfile is null) return Forbid();

            // Tutor can only read progress for students enrolled in one of THEIR batches.
            var hasEnrollment = await _enrollmentRepository.HasAnyForTutorAndStudentAsync(
                tutorProfile.Id, studentProfileId, cancellationToken);
            if (!hasEnrollment) return Forbid();

            var progress = await _progressService.GetStudentProgressAsync(studentProfileId, cancellationToken);
            return Ok(ApiResponse<StudentProgressResponse>.Ok(progress));
        }

        return Forbid();
    }

    // ── POST /api/v1/student-progress/goals  ──────────────────────────
    [HttpPost("goals")]
    public async Task<IActionResult> AddGoal([FromBody] AddLearningGoalRequest request, CancellationToken cancellationToken)
    {
        var forbidden = HttpContext.ForbidUnlessActiveStudent();
        if (forbidden is not null) return forbidden;

        var authUserId = AuthUserId;
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        var studentProfile = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
        if (studentProfile is null) return NotFound(new { message = "Student profile not found." });

        var goal = await _progressService.AddLearningGoalAsync(studentProfile.Id, request, cancellationToken);
        return Ok(ApiResponse<LearningGoalResponse>.Ok(goal, "Learning goal added."));
    }

    // ── PATCH /api/v1/student-progress/goals/{goalId}/status  ─────────
    [HttpPatch("goals/{goalId:guid}/status")]
    public async Task<IActionResult> UpdateGoalStatus(
        Guid goalId,
        [FromBody] UpdateGoalStatusRequest request,
        CancellationToken cancellationToken)
    {
        var forbidden = HttpContext.ForbidUnlessActiveStudent();
        if (forbidden is not null) return forbidden;

        var authUserId = AuthUserId;
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        var studentProfile = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
        if (studentProfile is null) return NotFound(new { message = "Student profile not found." });

        try
        {
            var goal = await _progressService.UpdateGoalStatusAsync(
                goalId,
                studentProfile.Id,
                request,
                cancellationToken);
            return Ok(ApiResponse<LearningGoalResponse>.Ok(goal, "Goal status updated."));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ── POST /api/v1/student-progress/assessments  ────────────────────
    // Both tutor and student can add an assessment, but each only against
    // a student profile they are authorised to write to.
    [HttpPost("assessments")]
    public async Task<IActionResult> AddAssessment(
        [FromBody] AddAssessmentRecordRequest request,
        CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId;
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        Guid studentProfileId;
        Guid? tutorProfileId = null;

        if (HttpContext.IsTutor())
        {
            if (request.StudentProfileId is null)
            {
                return BadRequest(new { message = "StudentProfileId is required when a tutor adds an assessment." });
            }

            var tutorProfile = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
            if (tutorProfile is null) return Forbid();

            var hasEnrollment = await _enrollmentRepository.HasAnyForTutorAndStudentAsync(
                tutorProfile.Id, request.StudentProfileId.Value, cancellationToken);
            if (!hasEnrollment) return Forbid();

            studentProfileId = request.StudentProfileId.Value;
            tutorProfileId = tutorProfile.Id;
        }
        else if (HttpContext.IsStudent())
        {
            var studentProfile = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
            if (studentProfile is null) return NotFound(new { message = "Student profile not found." });

            // Reject a tutor on the same account trying to assert a foreign student id.
            if (request.StudentProfileId is not null && request.StudentProfileId.Value != studentProfile.Id)
            {
                return Forbid();
            }

            studentProfileId = studentProfile.Id;
        }
        else
        {
            return Forbid();
        }

        var assessment = await _progressService.AddAssessmentRecordAsync(
            studentProfileId,
            tutorProfileId,
            authUserId,
            request,
            cancellationToken);
        return Ok(ApiResponse<AssessmentRecordResponse>.Ok(assessment, "Assessment recorded."));
    }

    // ── POST /api/v1/student-progress/session-notes  ──────────────────
    // Only the active-tutor that taught the student can leave session notes.
    [HttpPost("session-notes")]
    public async Task<IActionResult> AddSessionNote(
        [FromBody] AddSessionNoteRequest request,
        CancellationToken cancellationToken)
    {
        var forbidden = HttpContext.ForbidUnlessActiveTutor();
        if (forbidden is not null) return forbidden;

        var authUserId = AuthUserId;
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        var tutorProfile = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
        if (tutorProfile is null) return Forbid();

        try
        {
            var note = await _progressService.AddSessionNoteAsync(tutorProfile.Id, request, cancellationToken);
            return Ok(ApiResponse<SessionNoteResponse>.Ok(note, "Session note submitted."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
