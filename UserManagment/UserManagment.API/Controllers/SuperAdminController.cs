using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UserManagment.API.Contracts;
using UserManagment.API.Extensions;
using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Enums;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.API.Controllers;

[ApiController]
[Route("api/v1/super-admin")]
public class SuperAdminController : ControllerBase
{
    private readonly ISuperAdminVerificationService _superAdminVerificationService;
    private readonly UserManagmentDbContext _context;

    public SuperAdminController(ISuperAdminVerificationService superAdminVerificationService, UserManagmentDbContext context)
    {
        _superAdminVerificationService = superAdminVerificationService;
        _context = context;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin())
        {
            return Forbid();
        }

        var dashboard = await _superAdminVerificationService.GetDashboardAsync(cancellationToken);
        return Ok(ApiResponse<SuperAdminDashboardResponse>.Ok(dashboard));
    }

    [HttpGet("tutor-requests")]
    public async Task<IActionResult> GetTutorRequests([FromQuery] string? status, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin())
        {
            return Forbid();
        }

        var requests = (await _superAdminVerificationService.GetTutorRequestsAsync(status, cancellationToken)).ToList();
        if (requests.Count > 0)
        {
            var emails = requests.Select(r => r.Email.Trim().ToLowerInvariant()).Distinct().ToList();
            var priorDeletions = await _context.AdminActionAudits.AsNoTracking()
                .Where(a => a.Action == "USER_DELETED" && a.TargetEmail != null && emails.Contains(a.TargetEmail.ToLower()))
                .OrderByDescending(a => a.CreatedAtUtc)
                .ToListAsync(cancellationToken);

            var deletionByEmail = priorDeletions
                .GroupBy(a => a.TargetEmail!.ToLowerInvariant())
                .ToDictionary(g => g.Key, g => g.First());

            foreach (var request in requests)
            {
                if (deletionByEmail.TryGetValue(request.Email.Trim().ToLowerInvariant(), out var audit))
                {
                    request.PreviouslyRemovedAtUtc = audit.CreatedAtUtc;
                    request.PreviouslyRemovedReason = audit.Reason;
                }
            }
        }

        return Ok(ApiResponse<IReadOnlyCollection<TutorRequestSummaryResponse>>.Ok(requests));
    }

    [HttpPost("tutor-requests/{tutorProfileId:guid}/review")]
    public async Task<IActionResult> ReviewTutor(
        [FromRoute] Guid tutorProfileId,
        [FromBody] TutorVerificationDecisionRequest request,
        CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin())
        {
            return Forbid();
        }

        var adminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? HttpContext.GetAuthUserId() ?? "super-admin";
        var reviewed = await _superAdminVerificationService.ReviewTutorAsync(adminId, tutorProfileId, request, cancellationToken);

        return Ok(ApiResponse<TutorRequestSummaryResponse>.Ok(reviewed, "Tutor verification decision recorded"));
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics(CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin())
        {
            return Forbid();
        }

        var startOfWeek = DateTime.UtcNow.AddDays(-7);

        var totalUsers = await _context.UserAccounts.CountAsync(cancellationToken);
        var totalTutors = await _context.TutorProfiles.CountAsync(cancellationToken);
        var totalStudents = await _context.StudentProfiles.CountAsync(cancellationToken);
        var approvedTutors = await _context.TutorProfiles.CountAsync(t => t.VerificationStatus == TutorVerificationStatus.Approved, cancellationToken);
        var pendingTutors = await _context.TutorProfiles.CountAsync(t => t.VerificationStatus == TutorVerificationStatus.Pending, cancellationToken);

        var allBookings = await _context.Bookings.ToListAsync(cancellationToken);
        var totalRevenue = allBookings.Where(b => b.Status == BookingStatus.Completed).Sum(b => b.Fee);
        var bookingsThisWeek = allBookings.Count(b => b.CreatedAtUtc >= startOfWeek);
        var newUsersThisWeek = await _context.UserAccounts.CountAsync(u => u.CreatedAtUtc >= startOfWeek, cancellationToken);

        var totalReviews = await _context.Reviews.CountAsync(cancellationToken);
        var avgRating = totalReviews > 0
            ? await _context.Reviews.AverageAsync(r => (double)r.Rating, cancellationToken)
            : 0;

        var analytics = new AnalyticsResponse
        {
            TotalUsers = totalUsers,
            TotalTutors = totalTutors,
            TotalStudents = totalStudents,
            ApprovedTutors = approvedTutors,
            PendingTutors = pendingTutors,
            TotalBookings = allBookings.Count,
            PendingBookings = allBookings.Count(b => b.Status == BookingStatus.Pending),
            ConfirmedBookings = allBookings.Count(b => b.Status == BookingStatus.Confirmed),
            CompletedBookings = allBookings.Count(b => b.Status == BookingStatus.Completed),
            CancelledBookings = allBookings.Count(b => b.Status == BookingStatus.Cancelled),
            TotalRevenue = totalRevenue,
            BookingsThisWeek = bookingsThisWeek,
            NewUsersThisWeek = newUsersThisWeek,
            TotalReviews = totalReviews,
            AveragePlatformRating = Math.Round(avgRating, 1)
        };

        return Ok(ApiResponse<AnalyticsResponse>.Ok(analytics));
    }

}
