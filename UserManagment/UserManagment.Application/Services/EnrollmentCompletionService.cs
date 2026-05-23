using Microsoft.Extensions.Configuration;
using UserManagment.Application.Helpers;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Services;

public class EnrollmentCompletionService : IEnrollmentCompletionService
{
    private readonly IBatchEnrollmentRepository _enrollmentRepository;
    private readonly IEnrollmentBillingPeriodRepository _billingRepository;
    private readonly ITutorProfileRepository _tutorProfileRepository;
    private readonly INotificationService _notificationService;
    private readonly ITutorBatchRepository _batchRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _recommendationBaseUrl;

    public EnrollmentCompletionService(
        IBatchEnrollmentRepository enrollmentRepository,
        IEnrollmentBillingPeriodRepository billingRepository,
        ITutorProfileRepository tutorProfileRepository,
        INotificationService notificationService,
        ITutorBatchRepository batchRepository,
        IUnitOfWork unitOfWork,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _enrollmentRepository = enrollmentRepository;
        _billingRepository = billingRepository;
        _tutorProfileRepository = tutorProfileRepository;
        _notificationService = notificationService;
        _batchRepository = batchRepository;
        _unitOfWork = unitOfWork;
        _httpClientFactory = httpClientFactory;
        _recommendationBaseUrl = configuration["Services:RecommendationServiceUrl"]
            ?? "http://recommendation-service:8000";
    }

    public async Task CompleteEnrollmentAsync(string authUserId, Guid enrollmentId, CancellationToken cancellationToken)
    {
        var tutor = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor profile not found.");

        var enrollment = await _enrollmentRepository.GetByIdAsync(enrollmentId, cancellationToken)
            ?? throw new InvalidOperationException("Enrollment not found.");

        if (enrollment.TutorProfileId != tutor.Id)
        {
            throw new UnauthorizedAccessException("Not authorized to complete this enrollment.");
        }

        enrollment.TutorProfile ??= tutor;
        DualRoleValidationHelper.EnsureNotSelfTutorAction(enrollment);

        if (enrollment.Status is BatchEnrollmentStatus.Completed or BatchEnrollmentStatus.Withdrawn or BatchEnrollmentStatus.Cancelled)
        {
            throw new InvalidOperationException($"Enrollment is already {enrollment.Status}.");
        }

        await MarkCompletedAsync(enrollment, cancellationToken);
    }

    public async Task TryAutoCompleteEnrollmentAsync(Guid enrollmentId, CancellationToken cancellationToken)
    {
        var enrollment = await _enrollmentRepository.GetByIdAsync(enrollmentId, cancellationToken);
        if (enrollment is null || enrollment.Status != BatchEnrollmentStatus.Active)
        {
            return;
        }

        if (enrollment.EndDateUtc > DateTime.UtcNow)
        {
            return;
        }

        var periods = await _billingRepository.GetByEnrollmentAsync(enrollmentId, cancellationToken);
        if (periods.Count == 0)
        {
            return;
        }

        var settled = periods.Count(p =>
            p.Status is EnrollmentBillingPeriodStatus.Paid or EnrollmentBillingPeriodStatus.Waived);
        var ratio = (double)settled / periods.Count;
        if (ratio < 0.8)
        {
            return;
        }

        await MarkCompletedAsync(enrollment, cancellationToken);
    }

    public async Task TryAutoCompletePastEnrollmentsAsync(CancellationToken cancellationToken)
    {
        var candidates = await _enrollmentRepository.GetActiveEndedEnrollmentIdsAsync(cancellationToken);

        foreach (var id in candidates)
        {
            await TryAutoCompleteEnrollmentAsync(id, cancellationToken);
        }
    }

    private async Task MarkCompletedAsync(Domain.Entities.BatchEnrollment enrollment, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        enrollment.Status = BatchEnrollmentStatus.Completed;
        enrollment.CompletionDateUtc = now;
        enrollment.UpdatedAtUtc = now;

        await _batchRepository.CompleteScheduledSessionsUpToAsync(enrollment.TutorBatchId, now, cancellationToken);
        await _enrollmentRepository.UpdateAsync(enrollment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (enrollment.StudentProfile?.UserAccount != null)
        {
            await _notificationService.CreateAsync(
                enrollment.StudentProfile.UserAccount.AuthUserId,
                NotificationType.BookingConfirmed,
                "Course completed",
                $"Your enrollment in {enrollment.TutorBatch?.Title ?? enrollment.Subject} is complete. You have 10 days to leave a review.",
                enrollment.Id,
                cancellationToken);
        }

        _ = TriggerRecommendationRecomputeAsync(enrollment.TutorProfileId);
    }

    private async Task TriggerRecommendationRecomputeAsync(Guid tutorProfileId)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            await client.PostAsync($"{_recommendationBaseUrl}/api/v1/recommendations/recompute", null);
        }
        catch
        {
            // Non-blocking
        }
    }
}
