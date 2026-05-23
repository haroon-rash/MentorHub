using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserManagment.API.Extensions;
using UserManagment.API.Services;
using UserManagment.Application.Interfaces;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.API.Controllers;

/// <summary>Student announcements and booking-derived tutor list (replaces broken Java stubs).</summary>
[Authorize]
[ApiController]
[Route("api/v1/student-announcements")]
public class StudentAnnouncementsBridgeController : ControllerBase
{
    private readonly IBookingService _bookingService;
    private readonly UserManagmentDbContext _context;

    public StudentAnnouncementsBridgeController(IBookingService bookingService, UserManagmentDbContext context)
    {
        _bookingService = bookingService;
        _context = context;
    }

    [HttpGet("my-tutors")]
    public async Task<IActionResult> GetMyTutors(CancellationToken cancellationToken)
    {
        if (!HttpContext.IsStudent()) return Forbid();

        var authUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrWhiteSpace(authUserId)) return Unauthorized();

        try
        {
            var tutors = await _bookingService.GetStudentTutorSummariesAsync(authUserId, cancellationToken);
            var student = await _context.StudentProfiles.AsNoTracking()
                .Include(s => s.UserAccount)
                .FirstOrDefaultAsync(s => s.UserAccount!.AuthUserId == authUserId, cancellationToken);

            var enriched = new List<object>();
            foreach (var t in tutors)
            {
                var total = await AnnouncementStatsService.CountForTutorAsync(_context, t.TutorProfileId, cancellationToken);
                var unread = student != null
                    ? await AnnouncementStatsService.CountUnreadForStudentTutorAsync(
                        _context, student.Id, t.TutorProfileId, cancellationToken)
                    : 0;

                enriched.Add(new
                {
                    tutorProfileId = t.TutorProfileId,
                    fullName = t.FullName,
                    profilePhotoUrl = t.ProfilePhotoUrl,
                    subject = t.Subject,
                    hourlyFee = t.HourlyFee,
                    averageRating = t.AverageRating,
                    announcementCount = total,
                    unreadAnnouncementCount = unread,
                    bookingStatus = t.BookingStatus,
                    bookingDate = t.BookingDate,
                    totalSessions = t.TotalSessions,
                });
            }

            return Ok(new { success = true, data = enriched });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("unread-summary")]
    public async Task<IActionResult> GetUnreadSummary(CancellationToken cancellationToken)
    {
        if (!HttpContext.IsStudent()) return Forbid();

        var authUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrWhiteSpace(authUserId)) return Unauthorized();

        var student = await _context.StudentProfiles.AsNoTracking()
            .Include(s => s.UserAccount)
            .FirstOrDefaultAsync(s => s.UserAccount!.AuthUserId == authUserId, cancellationToken);
        if (student == null)
        {
            return Ok(new { success = true, data = new { totalUnread = 0 } });
        }

        var tutors = await _bookingService.GetStudentTutorSummariesAsync(authUserId, cancellationToken);
        var tutorIds = tutors.Select(t => t.TutorProfileId).ToList();
        var totalUnread = await AnnouncementStatsService.CountUnreadForStudentAsync(
            _context, student.Id, tutorIds, cancellationToken);

        return Ok(new { success = true, data = new { totalUnread } });
    }

    [HttpGet]
    public async Task<IActionResult> GetMyAnnouncements(CancellationToken cancellationToken)
    {
        if (!HttpContext.IsStudent()) return Forbid();

        var authUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrWhiteSpace(authUserId)) return Unauthorized();

        var student = await _context.StudentProfiles.AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserAccount != null && s.UserAccount.AuthUserId == authUserId, cancellationToken);
        if (student == null)
        {
            return Ok(new { success = true, data = Array.Empty<object>() });
        }

        var tutors = await _bookingService.GetStudentTutorSummariesAsync(authUserId, cancellationToken);
        var tutorNames = tutors.ToDictionary(t => t.TutorProfileId, t => t.FullName);
        var items = await AnnouncementStatsService.ListForStudentAsync(
            _context,
            student.Id,
            tutors.Select(t => t.TutorProfileId).ToList(),
            tutorNames,
            cancellationToken);

        return Ok(new { success = true, data = items });
    }

    [HttpGet("tutor/{tutorProfileId:guid}")]
    public async Task<IActionResult> GetFromTutor(Guid tutorProfileId, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsStudent()) return Forbid();

        var authUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrWhiteSpace(authUserId)) return Unauthorized();

        var student = await _context.StudentProfiles.AsNoTracking()
            .Include(s => s.UserAccount)
            .FirstOrDefaultAsync(s => s.UserAccount!.AuthUserId == authUserId, cancellationToken);
        if (student == null)
        {
            return Ok(new { success = true, data = Array.Empty<object>() });
        }

        var nameMap = await AnnouncementStatsService.ResolveTutorDisplayNamesAsync(
            _context, new[] { tutorProfileId }, cancellationToken);
        var tutorName = nameMap.GetValueOrDefault(tutorProfileId, "Tutor");

        var items = await AnnouncementStatsService.ListForTutorAsync(
            _context, tutorProfileId, student.Id, tutorName, cancellationToken);

        return Ok(new { success = true, data = items });
    }

    [HttpPost("{announcementId:guid}/mark-read")]
    public async Task<IActionResult> MarkRead(Guid announcementId, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsStudent()) return Forbid();

        var authUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrWhiteSpace(authUserId)) return Unauthorized();

        var student = await _context.StudentProfiles.AsNoTracking()
            .Include(s => s.UserAccount)
            .FirstOrDefaultAsync(s => s.UserAccount!.AuthUserId == authUserId, cancellationToken);
        if (student == null)
        {
            return BadRequest(new { success = false, message = "Student profile not found" });
        }

        await AnnouncementStatsService.MarkReadAsync(_context, announcementId, student.Id, cancellationToken);
        return Ok(new { success = true, message = "Announcement marked as read" });
    }
}
