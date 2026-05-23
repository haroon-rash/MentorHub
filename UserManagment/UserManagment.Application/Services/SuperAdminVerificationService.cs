using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Services;

public class SuperAdminVerificationService : ISuperAdminVerificationService
{
    private readonly ITutorProfileRepository _tutorProfileRepository;
    private readonly ITutorVerificationAuditRepository _auditRepository;
    private readonly IMessagePublisher _messagePublisher;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IUserAccountRepository _userAccountRepository;
    private readonly IBookingRepository _bookingRepository;
    private readonly ITutorApprovedCatalogSync _catalogSync;

    public SuperAdminVerificationService(
        ITutorProfileRepository tutorProfileRepository,
        ITutorVerificationAuditRepository auditRepository,
        IMessagePublisher messagePublisher,
        IUnitOfWork unitOfWork,
        IUserAccountRepository userAccountRepository,
        IBookingRepository bookingRepository,
        ITutorApprovedCatalogSync catalogSync)
    {
        _tutorProfileRepository = tutorProfileRepository;
        _auditRepository = auditRepository;
        _messagePublisher = messagePublisher;
        _unitOfWork = unitOfWork;
        _userAccountRepository = userAccountRepository;
        _bookingRepository = bookingRepository;
        _catalogSync = catalogSync;
    }

    public async Task<SuperAdminDashboardResponse> GetDashboardAsync(CancellationToken cancellationToken)
    {
        var latest = await _tutorProfileRepository.GetTutorRequestsAsync(null, cancellationToken);
        
        return new SuperAdminDashboardResponse
        {
            TotalTutorRequests = await _tutorProfileRepository.CountAsync(null, cancellationToken),
            PendingTutorRequests = await _tutorProfileRepository.CountAsync(TutorVerificationStatus.Pending, cancellationToken),
            ApprovedTutors = await _tutorProfileRepository.CountAsync(TutorVerificationStatus.Approved, cancellationToken),
            RejectedTutors = await _tutorProfileRepository.CountAsync(TutorVerificationStatus.Rejected, cancellationToken),
            LatestRequests = latest
                .OrderByDescending(item => item.CreatedAtUtc)
                .Take(20)
                .Select(ToSummary)
                .ToArray(),
            TotalRevenue = await _bookingRepository.GetTotalRevenueAsync(cancellationToken),
            AverageSessionPrice = await _bookingRepository.GetAverageFeeAsync(cancellationToken),
            TotalStudents = await _userAccountRepository.CountAllAsync(null, cancellationToken),
            TotalTutors = await _tutorProfileRepository.CountAsync(null, cancellationToken),
            PendingBookings = await _bookingRepository.CountByStatusAsync(BookingStatus.Pending, cancellationToken),
            ConfirmedBookings = await _bookingRepository.CountByStatusAsync(BookingStatus.Confirmed, cancellationToken)
        };
    }

    public async Task<IReadOnlyCollection<TutorRequestSummaryResponse>> GetTutorRequestsAsync(string? status, CancellationToken cancellationToken)
    {
        TutorVerificationStatus? parsedStatus = null;
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<TutorVerificationStatus>(status, true, out var typedStatus))
        {
            parsedStatus = typedStatus;
        }

        var requests = await _tutorProfileRepository.GetTutorRequestsAsync(parsedStatus, cancellationToken);
        return requests.Select(ToSummary).ToArray();
    }

    public async Task<TutorRequestSummaryResponse> ReviewTutorAsync(
        string adminId,
        Guid tutorProfileId,
        TutorVerificationDecisionRequest request,
        CancellationToken cancellationToken)
    {
        var profile = await _tutorProfileRepository.GetByIdAsync(tutorProfileId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor profile not found");

        profile.VerificationStatus = request.Approve ? TutorVerificationStatus.Approved : TutorVerificationStatus.Rejected;
        profile.VerificationNotes = request.Notes;
        profile.ReviewedByAdminId = adminId;
        profile.ReviewedAtUtc = DateTime.UtcNow;
        profile.UpdatedAtUtc = DateTime.UtcNow;

        await _tutorProfileRepository.UpdateAsync(profile, cancellationToken);
        await _auditRepository.AddAsync(new TutorVerificationAudit
        {
            Id = Guid.NewGuid(),
            TutorProfileId = profile.Id,
            AdminId = adminId,
            Action = request.Approve ? "APPROVED" : "REJECTED",
            Notes = request.Notes,
            ActionAtUtc = DateTime.UtcNow
        }, cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _catalogSync.SyncAfterReviewAsync(profile, cancellationToken);

        try
        {
            // Publish comprehensive review event for the Tutor Catalog (coreoperations-service)
            await _messagePublisher.PublishTutorReviewedAsync(
                profile.Id,
                profile.UserAccount.AuthUserId,
                profile.UserAccount.FullName,
                profile.UserAccount.Email,
                profile.VerificationStatus.ToString(),
                profile.ProfilePhotoUrl,
                profile.HighestDegree,
                profile.YearsOfExperience,
                profile.HourlyFee,
                profile.SubjectsCsv,
                profile.Bio,
                profile.TeachingMethodology,
                profile.TeachingMode.ToString(),
                profile.InPersonLocation,
                profile.ReviewedAtUtc,
                cancellationToken);

            // Keep status-specific events for other potential listeners (e.g. Notifications)
            if (request.Approve)
            {
                await _messagePublisher.PublishTutorApprovedAsync(
                    profile.Id,
                    profile.UserAccount.AuthUserId,
                    profile.UserAccount.FullName,
                    profile.UserAccount.Email,
                    profile.VerificationStatus.ToString(),
                    profile.VerificationNotes ?? string.Empty,
                    profile.ReviewedAtUtc,
                    cancellationToken);
            }
            else
            {
                await _messagePublisher.PublishTutorRejectedAsync(
                    profile.Id,
                    profile.UserAccount.AuthUserId,
                    profile.UserAccount.FullName,
                    profile.UserAccount.Email,
                    profile.VerificationStatus.ToString(),
                    profile.VerificationNotes ?? string.Empty,
                    profile.ReviewedAtUtc,
                    cancellationToken);
            }
        }
        catch
        {
            // Publish failures should not roll back the approval state.
        }

        return ToSummary(profile);
    }

    public async Task<PagedResponse<UserDirectoryResponse>> GetUsersAsync(int skip, int take, string? search, CancellationToken cancellationToken)
    {
        var users = await _userAccountRepository.GetAllPagedAsync(skip, take, search, cancellationToken);
        var count = await _userAccountRepository.CountAllAsync(search, cancellationToken);

        var items = users.Select(u => new UserDirectoryResponse
        {
            Id = u.Id,
            AuthUserId = u.AuthUserId,
            FullName = u.FullName,
            Email = u.Email,
            Role = u.Role.ToString(),
            IsEmailVerified = u.IsEmailVerified,
            CreatedAtUtc = u.CreatedAtUtc
        }).ToArray();

        return new PagedResponse<UserDirectoryResponse>
        {
            Items = items,
            TotalCount = count
        };
    }

    public async Task DeleteUserAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await _userAccountRepository.GetByIdAsync(id, cancellationToken)
                   ?? await _userAccountRepository.GetByAuthUserIdAsync(id.ToString(), cancellationToken);

        if (user != null)
        {
            await _userAccountRepository.DeleteAsync(user, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
    }

    private static string FormatTeachingMode(TeachingMode mode) =>
        mode switch
        {
            TeachingMode.InPerson => "InPerson",
            TeachingMode.Both => "Both",
            _ => "Online"
        };

    private static TutorRequestSummaryResponse ToSummary(TutorProfile profile)
    {
        return new TutorRequestSummaryResponse
        {
            TutorProfileId = profile.Id,
            AuthUserId = profile.UserAccount.AuthUserId,
            FullName = profile.UserAccount.FullName,
            Email = profile.UserAccount.Email,
            VerificationStatus = profile.VerificationStatus.ToString(),
            ProfileCompleteness = profile.ProfileCompleteness,
            HighestDegree = profile.HighestDegree,
            YearsOfExperience = profile.YearsOfExperience,
            CreatedAtUtc = profile.CreatedAtUtc,
            Bio = profile.Bio,
            ProfilePhotoUrl = profile.ProfilePhotoUrl,
            DegreeCertificateUrl = profile.DegreeCertificateUrl,
            GovernmentIdDocumentUrl = profile.GovernmentIdDocumentUrl,
            HourlyFee = profile.HourlyFee,
            Subjects = string.IsNullOrWhiteSpace(profile.SubjectsCsv)
                ? Array.Empty<string>()
                : profile.SubjectsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
            TeachingMethodology = profile.TeachingMethodology,
            TeachingMode = FormatTeachingMode(profile.TeachingMode),
            InPersonLocation = profile.InPersonLocation,
            TeachingLicensesOrCertificatesUrl = profile.TeachingLicensesOrCertificatesUrl,
            VerificationNotes = profile.VerificationNotes,
            FieldOfStudy = profile.FieldOfStudy,
            InstitutionName = profile.InstitutionName,
            GraduationYear = profile.GraduationYear,
            GradeLevels = string.IsNullOrWhiteSpace(profile.GradeLevelsCsv)
                ? Array.Empty<string>()
                : profile.GradeLevelsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
            Languages = string.IsNullOrWhiteSpace(profile.LanguagesCsv)
                ? Array.Empty<string>()
                : profile.LanguagesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
            AvailableDays = string.IsNullOrWhiteSpace(profile.AvailableDaysCsv)
                ? Array.Empty<string>()
                : profile.AvailableDaysCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
            AvailableTimeSlots = string.IsNullOrWhiteSpace(profile.AvailableTimeSlotsCsv)
                ? Array.Empty<string>()
                : profile.AvailableTimeSlotsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
            MonthlyFee = profile.MonthlyFee,
            Achievements = profile.Achievements,
            GovernmentIdType = profile.GovernmentIdType.ToString(),
            BackgroundCheckConsent = profile.BackgroundCheckConsent,
            TermsAccepted = profile.TermsAccepted,
            PrivacyAccepted = profile.PrivacyAccepted,
            CommissionPolicyAccepted = profile.CommissionPolicyAccepted
        };
    }

}
