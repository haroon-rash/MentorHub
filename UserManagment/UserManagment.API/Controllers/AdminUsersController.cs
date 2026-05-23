using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UserManagment.API.Contracts;
using UserManagment.API.Extensions;
using UserManagment.API.Services;
using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.API.Controllers;

[ApiController]
[Route("api/v1/super-admin/users")]
public class AdminUsersController : ControllerBase
{
    private readonly UserManagmentDbContext _context;
    private readonly ISuperAdminVerificationService _verificationService;
    private readonly IAdminCredentialVerifier _credentialVerifier;
    private readonly IAuthUserDeletionClient _authUserDeletionClient;
    private readonly IAdminPermanentUserDeletionService _permanentDeletionService;

    public AdminUsersController(
        UserManagmentDbContext context,
        ISuperAdminVerificationService verificationService,
        IAdminCredentialVerifier credentialVerifier,
        IAuthUserDeletionClient authUserDeletionClient,
        IAdminPermanentUserDeletionService permanentDeletionService)
    {
        _context = context;
        _verificationService = verificationService;
        _credentialVerifier = credentialVerifier;
        _authUserDeletionClient = authUserDeletionClient;
        _permanentDeletionService = permanentDeletionService;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers(
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? role = null,
        [FromQuery] bool? emailVerified = null,
        [FromQuery] string? tutorVerification = null,
        [FromQuery] bool? hasRestriction = null,
        [FromQuery] bool? hasWarnings = null,
        CancellationToken cancellationToken = default)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();

        var now = DateTime.UtcNow;
        var query = _context.UserAccounts.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u => u.FullName.ToLower().Contains(s) || u.Email.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<PlatformUserRole>(role, true, out var parsedRole))
        {
            query = query.Where(u => u.Role == parsedRole);
        }

        if (emailVerified.HasValue)
        {
            query = query.Where(u => u.IsEmailVerified == emailVerified.Value);
        }

        if (!string.IsNullOrWhiteSpace(tutorVerification) &&
            Enum.TryParse<TutorVerificationStatus>(tutorVerification, true, out var tvStatus))
        {
            query = query.Where(u =>
                u.TutorProfile != null && u.TutorProfile.VerificationStatus == tvStatus);
        }

        if (hasRestriction == true)
        {
            var restrictedIds = await _context.AccountRestrictions.AsNoTracking()
                .Where(r => r.IsActive && (r.ExpiresAtUtc == null || r.ExpiresAtUtc > now))
                .Select(r => r.TargetAuthUserId)
                .Distinct()
                .ToListAsync(cancellationToken);
            query = query.Where(u => restrictedIds.Contains(u.AuthUserId));
        }

        if (hasWarnings == true)
        {
            var warnedIds = await _context.UserWarnings.AsNoTracking()
                .Where(w => w.IsActive && (w.ExpiresAtUtc == null || w.ExpiresAtUtc > now))
                .Select(w => w.TargetAuthUserId)
                .Distinct()
                .ToListAsync(cancellationToken);
            query = query.Where(u => warnedIds.Contains(u.AuthUserId));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var users = await query
            .Include(u => u.TutorProfile)
            .Include(u => u.StudentProfile)
            .OrderByDescending(u => u.CreatedAtUtc)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        var authIds = users.Select(u => u.AuthUserId).ToList();
        var warningCounts = await _context.UserWarnings.AsNoTracking()
            .Where(w => authIds.Contains(w.TargetAuthUserId) && w.IsActive && (w.ExpiresAtUtc == null || w.ExpiresAtUtc > now))
            .GroupBy(w => w.TargetAuthUserId)
            .Select(g => new { AuthUserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.AuthUserId, x => x.Count, cancellationToken);

        var restrictedSet = (await _context.AccountRestrictions.AsNoTracking()
            .Where(r => authIds.Contains(r.TargetAuthUserId) && r.IsActive && (r.ExpiresAtUtc == null || r.ExpiresAtUtc > now))
            .Select(r => r.TargetAuthUserId)
            .Distinct()
            .ToListAsync(cancellationToken)).ToHashSet();

        var emailList = users.Select(u => u.Email.Trim().ToLowerInvariant()).Distinct().ToList();
        var verifiedByEmail = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
        foreach (var email in emailList)
        {
            var row = await _context.Database
                .SqlQuery<SignupVerifiedRow>($"""
                    SELECT is_verified AS "IsVerified"
                    FROM signup_user
                    WHERE lower(user_email) = {email}
                    LIMIT 1
                    """)
                .FirstOrDefaultAsync(cancellationToken);
            if (row != null)
            {
                verifiedByEmail[email] = row.IsVerified;
            }
        }

        var items = users.Select(u => new UserDirectoryResponse
        {
            Id = u.Id,
            AuthUserId = u.AuthUserId,
            FullName = u.FullName,
            Email = u.Email,
            Role = u.Role.ToString(),
            IsEmailVerified = verifiedByEmail.TryGetValue(u.Email.Trim().ToLowerInvariant(), out var verified)
                ? verified
                : u.IsEmailVerified,
            CreatedAtUtc = u.CreatedAtUtc,
            ProfilePhotoUrl = u.TutorProfile?.ProfilePhotoUrl ?? u.StudentProfile?.ProfilePhotoUrl,
            TutorProfileId = u.TutorProfile?.Id,
            TutorVerificationStatus = u.TutorProfile?.VerificationStatus.ToString(),
            ActiveWarningCount = warningCounts.GetValueOrDefault(u.AuthUserId, 0),
            HasActiveRestriction = restrictedSet.Contains(u.AuthUserId)
        }).ToArray();

        return Ok(ApiResponse<PagedResponse<UserDirectoryResponse>>.Ok(new PagedResponse<UserDirectoryResponse>
        {
            Items = items,
            TotalCount = totalCount
        }));
    }

    private sealed class SignupVerifiedRow
    {
        public bool IsVerified { get; set; }
    }

    private async Task<bool> GetSignupEmailVerifiedAsync(string email, bool fallback, CancellationToken cancellationToken)
    {
        var emailLower = email.Trim().ToLowerInvariant();
        var row = await _context.Database
            .SqlQuery<SignupVerifiedRow>($"""
                SELECT is_verified AS "IsVerified"
                FROM signup_user
                WHERE lower(user_email) = {emailLower}
                LIMIT 1
                """)
            .FirstOrDefaultAsync(cancellationToken);
        return row?.IsVerified ?? fallback;
    }

    [HttpGet("lookup")]
    public async Task<IActionResult> LookupByEmail([FromQuery] string email, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();
        if (string.IsNullOrWhiteSpace(email) || email.Length < 3)
        {
            return Ok(ApiResponse<IReadOnlyCollection<AdminUserLookupResponse>>.Ok(Array.Empty<AdminUserLookupResponse>()));
        }

        var now = DateTime.UtcNow;
        var emailLower = email.Trim().ToLower();
        var users = await _context.UserAccounts.AsNoTracking()
            .Include(u => u.TutorProfile)
            .Include(u => u.StudentProfile)
            .Where(u => u.Email.ToLower().Contains(emailLower) || u.FullName.ToLower().Contains(emailLower))
            .Take(12)
            .ToListAsync(cancellationToken);

        var authIds = users.Select(u => u.AuthUserId).ToList();
        var warningCounts = await _context.UserWarnings.AsNoTracking()
            .Where(w => authIds.Contains(w.TargetAuthUserId) && w.IsActive)
            .GroupBy(w => w.TargetAuthUserId)
            .Select(g => new { AuthUserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.AuthUserId, x => x.Count, cancellationToken);

        var restrictedSet = (await _context.AccountRestrictions.AsNoTracking()
            .Where(r => authIds.Contains(r.TargetAuthUserId) && r.IsActive && (r.ExpiresAtUtc == null || r.ExpiresAtUtc > now))
            .Select(r => r.TargetAuthUserId)
            .Distinct()
            .ToListAsync(cancellationToken)).ToHashSet();

        var verifiedByEmail = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
        foreach (var u in users)
        {
            var key = u.Email.Trim().ToLowerInvariant();
            if (verifiedByEmail.ContainsKey(key)) continue;
            verifiedByEmail[key] = await GetSignupEmailVerifiedAsync(u.Email, u.IsEmailVerified, cancellationToken);
        }

        var results = users.Select(u => new AdminUserLookupResponse
        {
            Id = u.Id,
            AuthUserId = u.AuthUserId,
            FullName = u.FullName,
            Email = u.Email,
            Role = u.Role.ToString(),
            IsEmailVerified = verifiedByEmail.TryGetValue(u.Email.Trim().ToLowerInvariant(), out var verified)
                ? verified
                : u.IsEmailVerified,
            ProfilePhotoUrl = u.TutorProfile?.ProfilePhotoUrl ?? u.StudentProfile?.ProfilePhotoUrl,
            TutorVerificationStatus = u.TutorProfile?.VerificationStatus.ToString(),
            ActiveWarningCount = warningCounts.GetValueOrDefault(u.AuthUserId, 0),
            HasActiveRestriction = restrictedSet.Contains(u.AuthUserId)
        }).ToArray();

        return Ok(ApiResponse<IReadOnlyCollection<AdminUserLookupResponse>>.Ok(results));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetUserDetail(Guid id, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();

        var user = await _context.UserAccounts.AsNoTracking()
            .Include(u => u.TutorProfile)
            .Include(u => u.StudentProfile)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
        {
            return NotFound(ApiResponse<string>.Fail("User not found"));
        }

        var now = DateTime.UtcNow;
        var warnings = await _context.UserWarnings.AsNoTracking()
            .Where(w => w.TargetAuthUserId == user.AuthUserId)
            .OrderByDescending(w => w.IssuedAtUtc)
            .Take(50)
            .ToListAsync(cancellationToken);

        var restrictions = await _context.AccountRestrictions.AsNoTracking()
            .Where(r => r.TargetAuthUserId == user.AuthUserId)
            .OrderByDescending(r => r.CreatedAtUtc)
            .Take(50)
            .ToListAsync(cancellationToken);

        var audits = user.TutorProfile != null
            ? await _context.TutorVerificationAudits.AsNoTracking()
                .Where(a => a.TutorProfileId == user.TutorProfile.Id)
                .OrderByDescending(a => a.ActionAtUtc)
                .Take(20)
                .ToListAsync(cancellationToken)
            : new List<TutorVerificationAudit>();

        var bookingQuery = _context.Bookings.AsNoTracking();
        var totalBookings = 0;
        var completedBookings = 0;
        var pendingBookings = 0;

        if (user.TutorProfile != null)
        {
            totalBookings = await bookingQuery.CountAsync(b => b.TutorProfileId == user.TutorProfile.Id, cancellationToken);
            completedBookings = await bookingQuery.CountAsync(b => b.TutorProfileId == user.TutorProfile.Id && b.Status == BookingStatus.Completed, cancellationToken);
            pendingBookings = await bookingQuery.CountAsync(b => b.TutorProfileId == user.TutorProfile.Id && b.Status == BookingStatus.Pending, cancellationToken);
        }
        else if (user.StudentProfile != null)
        {
            totalBookings = await bookingQuery.CountAsync(b => b.StudentProfileId == user.StudentProfile.Id, cancellationToken);
            completedBookings = await bookingQuery.CountAsync(b => b.StudentProfileId == user.StudentProfile.Id && b.Status == BookingStatus.Completed, cancellationToken);
            pendingBookings = await bookingQuery.CountAsync(b => b.StudentProfileId == user.StudentProfile.Id && b.Status == BookingStatus.Pending, cancellationToken);
        }

        var emailVerified = await GetSignupEmailVerifiedAsync(user.Email, user.IsEmailVerified, cancellationToken);

        var detail = new AdminUserDetailResponse
        {
            Id = user.Id,
            AuthUserId = user.AuthUserId,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role.ToString(),
            IsEmailVerified = emailVerified,
            CreatedAtUtc = user.CreatedAtUtc,
            Tutor = user.TutorProfile == null ? null : MapTutor(user.TutorProfile),
            Student = user.StudentProfile == null ? null : MapStudent(user.StudentProfile),
            Warnings = warnings.Select(w => new ModerationWarningSummary
            {
                Id = w.Id,
                Category = w.Category,
                Severity = w.Severity,
                Notes = w.Notes,
                IssuedAtUtc = w.IssuedAtUtc,
                ExpiresAtUtc = w.ExpiresAtUtc,
                IsActive = w.IsActive && (w.ExpiresAtUtc == null || w.ExpiresAtUtc > now)
            }).ToArray(),
            Restrictions = restrictions.Select(r => new ModerationRestrictionSummary
            {
                Id = r.Id,
                RestrictionType = r.RestrictionType,
                Reason = r.Reason,
                StartsAtUtc = r.StartsAtUtc,
                ExpiresAtUtc = r.ExpiresAtUtc,
                IsActive = r.IsActive && (r.ExpiresAtUtc == null || r.ExpiresAtUtc > now)
            }).ToArray(),
            VerificationHistory = audits.Select(a => new TutorVerificationAuditSummary
            {
                Action = a.Action,
                Notes = a.Notes,
                AdminId = a.AdminId,
                ActionAtUtc = a.ActionAtUtc
            }).ToArray(),
            Activity = new UserActivitySummary
            {
                TotalBookings = totalBookings,
                CompletedBookings = completedBookings,
                PendingBookings = pendingBookings
            }
        };

        return Ok(ApiResponse<AdminUserDetailResponse>.Ok(detail));
    }

    [HttpPost("{id:guid}/secure-delete")]
    public async Task<IActionResult> SecureDeleteUser(
        Guid id,
        [FromBody] SecureDeleteUserRequest request,
        CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();

        if (string.IsNullOrWhiteSpace(request.AdminPassword))
        {
            return BadRequest(ApiResponse<string>.Fail("Admin password is required"));
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest(ApiResponse<string>.Fail("Deletion reason is required"));
        }

        var adminAuthId = HttpContext.GetAuthUserId();
        if (string.IsNullOrWhiteSpace(adminAuthId))
        {
            return Unauthorized(ApiResponse<string>.Fail("Unauthorized"));
        }

        var adminAccount = await _context.UserAccounts.AsNoTracking()
            .FirstOrDefaultAsync(u => u.AuthUserId == adminAuthId, cancellationToken);
        var adminEmail = adminAccount?.Email?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(adminEmail))
        {
            return BadRequest(ApiResponse<string>.Fail("Admin account email not found. Ensure your admin profile exists in the platform database."));
        }

        var verified = await _credentialVerifier.VerifyPasswordAsync(adminEmail, request.AdminPassword, cancellationToken);
        if (!verified)
        {
            return Unauthorized(ApiResponse<string>.Fail("Invalid admin password"));
        }

        var target = await _context.UserAccounts
            .Include(u => u.TutorProfile)
            .Include(u => u.StudentProfile)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (target == null)
        {
            return NotFound(ApiResponse<string>.Fail("User not found"));
        }

        var targetEmail = target.Email.Trim().ToLowerInvariant();

        _context.AdminActionAudits.Add(new AdminActionAudit
        {
            Id = Guid.NewGuid(),
            AdminAuthUserId = adminAuthId,
            AdminEmail = adminEmail,
            Action = "USER_DELETED",
            TargetAuthUserId = target.AuthUserId,
            TargetEmail = targetEmail,
            TargetUserAccountId = target.Id,
            Reason = request.Reason.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        });
        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            await _authUserDeletionClient.DeleteAuthUserByEmailAsync(targetEmail, cancellationToken);
        }
        catch (Exception ex)
        {
            return StatusCode(502, ApiResponse<string>.Fail(ex.Message));
        }

        await _permanentDeletionService.DeletePermanentlyAsync(target, cancellationToken);

        return Ok(ApiResponse<object>.Ok(null, "User permanently removed. They must register again to use the platform."));
    }

    private static TutorDetailSection MapTutor(TutorProfile tp) => new()
    {
        TutorProfileId = tp.Id,
        VerificationStatus = tp.VerificationStatus.ToString(),
        VerificationNotes = tp.VerificationNotes,
        ReviewedAtUtc = tp.ReviewedAtUtc,
        ProfileCompleteness = tp.ProfileCompleteness,
        ProfilePhotoUrl = tp.ProfilePhotoUrl,
        HighestDegree = tp.HighestDegree,
        FieldOfStudy = tp.FieldOfStudy,
        InstitutionName = tp.InstitutionName,
        GraduationYear = tp.GraduationYear,
        YearsOfExperience = tp.YearsOfExperience,
        Subjects = SplitCsv(tp.SubjectsCsv),
        GradeLevels = SplitCsv(tp.GradeLevelsCsv),
        Languages = SplitCsv(tp.LanguagesCsv),
        AvailableDays = SplitCsv(tp.AvailableDaysCsv),
        AvailableTimeSlots = SplitCsv(tp.AvailableTimeSlotsCsv),
        Bio = tp.Bio,
        TeachingMethodology = tp.TeachingMethodology,
        Achievements = tp.Achievements,
        HourlyFee = tp.HourlyFee,
        MonthlyFee = tp.MonthlyFee,
        TeachingMode = tp.TeachingMode.ToString(),
        InPersonLocation = tp.InPersonLocation,
        GovernmentIdType = tp.GovernmentIdType.ToString(),
        DegreeCertificateUrl = tp.DegreeCertificateUrl,
        GovernmentIdDocumentUrl = tp.GovernmentIdDocumentUrl,
        TeachingLicensesOrCertificatesUrl = tp.TeachingLicensesOrCertificatesUrl,
        BackgroundCheckConsent = tp.BackgroundCheckConsent,
        TermsAccepted = tp.TermsAccepted,
        PrivacyAccepted = tp.PrivacyAccepted,
        CommissionPolicyAccepted = tp.CommissionPolicyAccepted
    };

    private static StudentDetailSection MapStudent(StudentProfile sp) => new()
    {
        StudentProfileId = sp.Id,
        ProfilePhotoUrl = sp.ProfilePhotoUrl,
        DateOfBirth = sp.DateOfBirth,
        Gender = sp.Gender,
        CityOrArea = sp.CityOrArea,
        EducationLevel = sp.EducationLevel,
        GradeLevel = sp.CurrentGradeOrYear,
        SchoolOrInstitution = sp.SchoolOrInstitutionName,
        MediumOfEducation = sp.MediumOfEducation,
        Subjects = SplitCsv(sp.SubjectsCsv),
        TopicsOfDifficulty = sp.TopicsOfDifficulty,
        TutoringPurpose = sp.TutoringPurpose,
        LearningGoals = sp.LearningGoalsOrTargetGrade,
        PreferredMode = sp.PreferredMode,
        PreferredDays = SplitCsv(sp.PreferredDaysCsv),
        PreferredTimeSlots = SplitCsv(sp.PreferredTimeSlotsCsv),
        BudgetPerSession = sp.BudgetPerSession,
        BudgetPerMonth = sp.BudgetPerMonth,
        PreferredTutorGender = sp.PreferredTutorGender,
        PreferredLanguageOfInstruction = sp.PreferredLanguageOfInstruction,
        GuardianFullName = sp.GuardianFullName,
        GuardianContactNumber = sp.GuardianContactNumber,
        GuardianEmailAddress = sp.GuardianEmailAddress,
        GuardianRelationship = sp.GuardianRelationship,
        GuardianConsentAcknowledgment = sp.GuardianConsentAcknowledgment,
        TermsAccepted = sp.TermsAccepted,
        PrivacyAccepted = sp.PrivacyAccepted,
        ProfileCompleteness = sp.ProfileCompleteness
    };

    private static string[] SplitCsv(string? csv) =>
        string.IsNullOrWhiteSpace(csv)
            ? Array.Empty<string>()
            : csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
