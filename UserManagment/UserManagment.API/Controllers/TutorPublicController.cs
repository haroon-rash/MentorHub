using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Enums;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.API.Controllers;

[ApiController]
[Route("api/v1/tutors")]
public class TutorPublicController : ControllerBase
{
    private readonly ITutorProfileRepository _tutorProfileRepository;
    private readonly UserManagmentDbContext _context;

    public TutorPublicController(ITutorProfileRepository tutorProfileRepository, UserManagmentDbContext context)
    {
        _tutorProfileRepository = tutorProfileRepository;
        _context = context;
    }

    /// <summary>
    /// Returns all approved tutors — used by the Find Tutors page.
    /// </summary>
    [HttpGet("approved")]
    public async Task<IActionResult> GetApprovedTutors(CancellationToken cancellationToken)
    {
        var tutors = await _context.TutorProfiles
            .Include(t => t.UserAccount)
            .Where(t => t.VerificationStatus == TutorVerificationStatus.Approved)
            .OrderByDescending(t => t.AverageRating)
            .ThenByDescending(t => t.ReviewCount)
            .ToListAsync(cancellationToken);

        return Ok(tutors.Select(MapToResponse));
    }

    /// <summary>
    /// Returns a single approved tutor by TutorProfile ID, UserAccount ID, or AuthUserId.
    /// Used by the tutor profile page (fetchApprovedTutorById).
    /// </summary>
    [HttpGet("approved/{id}")]
    public async Task<IActionResult> GetApprovedTutorById(string id, CancellationToken cancellationToken)
    {
        Domain.Entities.TutorProfile? tutor = null;

        if (Guid.TryParse(id, out var guid))
        {
            // Try TutorProfile ID first, then UserAccount ID
            tutor = await _context.TutorProfiles
                .Include(t => t.UserAccount)
                .FirstOrDefaultAsync(t =>
                    (t.Id == guid || t.UserAccount.Id == guid) &&
                    t.VerificationStatus == TutorVerificationStatus.Approved, cancellationToken);
        }

        // Fall back: try AuthUserId string match (handles non-GUID auth IDs)
        if (tutor == null)
        {
            tutor = await _context.TutorProfiles
                .Include(t => t.UserAccount)
                .FirstOrDefaultAsync(t =>
                    t.UserAccount.AuthUserId == id &&
                    t.VerificationStatus == TutorVerificationStatus.Approved, cancellationToken);
        }

        if (tutor == null) return NotFound();
        return Ok(MapToResponse(tutor));
    }

    /// <summary>
    /// Returns a single tutor by TutorProfile ID or UserAccount ID (any verification status).
    /// Used by the scheduling page (fetchTutorById).
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<TutorProfileResponse>> GetTutorById(Guid id, CancellationToken cancellationToken)
    {
        // Try by TutorProfile ID first, then fall back to UserAccount ID
        var tutor = await _tutorProfileRepository.GetByIdAsync(id, cancellationToken)
                    ?? await _tutorProfileRepository.GetByUserAccountIdAsync(id, cancellationToken);

        if (tutor == null) return NotFound();
        return Ok(MapToResponse(tutor));
    }

    /// <summary>
    /// Search approved tutors with optional filters.
    /// </summary>
    [HttpGet("search")]
    public async Task<IActionResult> SearchTutors(
        [FromQuery] string? subject,
        [FromQuery] decimal? minFee,
        [FromQuery] decimal? maxFee,
        [FromQuery] string? teachingMode,
        [FromQuery] string? location,
        [FromQuery] string? search,
        [FromQuery] double? minRating,
        CancellationToken cancellationToken)
    {
        var query = _context.TutorProfiles
            .Include(t => t.UserAccount)
            .Where(t => t.VerificationStatus == TutorVerificationStatus.Approved)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(t =>
                t.UserAccount.FullName.ToLower().Contains(term) ||
                t.Bio.ToLower().Contains(term) ||
                t.SubjectsCsv.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(subject))
        {
            var sub = subject.Trim().ToLower();
            query = query.Where(t => t.SubjectsCsv.ToLower().Contains(sub));
        }

        if (minFee.HasValue)
            query = query.Where(t => t.HourlyFee >= minFee.Value);

        if (maxFee.HasValue)
            query = query.Where(t => t.HourlyFee <= maxFee.Value);

        if (!string.IsNullOrWhiteSpace(teachingMode))
        {
            if (Enum.TryParse<TeachingMode>(teachingMode, true, out var mode))
                query = query.Where(t => t.TeachingMode == mode || t.TeachingMode == TeachingMode.Both);
        }

        if (!string.IsNullOrWhiteSpace(location))
        {
            var loc = location.Trim().ToLower();
            query = query.Where(t => t.InPersonLocation.ToLower().Contains(loc));
        }

        if (minRating.HasValue)
            query = query.Where(t => (t.AverageRating ?? 0) >= minRating.Value);

        var tutors = await query
            .OrderByDescending(t => t.AverageRating)
            .ThenByDescending(t => t.ReviewCount)
            .Take(100)
            .ToListAsync(cancellationToken);

        return Ok(tutors.Select(MapToResponse));
    }

    private static TutorProfileResponse MapToResponse(Domain.Entities.TutorProfile tutor) => new()
    {
        Id = tutor.Id,
        TutorProfileId = tutor.Id,
        AuthUserId = tutor.UserAccount.AuthUserId,
        FullName = tutor.UserAccount.FullName,
        Email = tutor.UserAccount.Email,
        Bio = tutor.Bio,
        HourlyFee = tutor.HourlyFee,
        HighestDegree = tutor.HighestDegree,
        TeachingMode = tutor.TeachingMode.ToString(),
        Subjects = tutor.SubjectsCsv?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
        GradeLevels = tutor.GradeLevelsCsv?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
        Languages = tutor.LanguagesCsv?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
        AvailableDays = tutor.AvailableDaysCsv?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
        AvailableTimeSlots = tutor.AvailableTimeSlotsCsv?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
        UnavailableDates = tutor.UnavailableDatesCsv?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
        ProfilePhotoUrl = tutor.ProfilePhotoUrl,
        VerificationStatus = tutor.VerificationStatus.ToString(),
        AverageRating = tutor.AverageRating ?? 0,
        ReviewCount = tutor.ReviewCount,
        InPersonLocation = tutor.InPersonLocation,
        YearsOfExperience = tutor.YearsOfExperience,
        TeachingMethodology = tutor.TeachingMethodology
    };
}
