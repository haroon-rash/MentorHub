using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Services;

public class ReviewEligibilityService : IReviewEligibilityService
{
    private const int ReviewWindowDays = 10;
    private readonly IBatchEnrollmentRepository _enrollmentRepository;
    private readonly IStudentProfileRepository _studentProfileRepository;
    private readonly IReviewRepository _reviewRepository;

    public ReviewEligibilityService(
        IBatchEnrollmentRepository enrollmentRepository,
        IStudentProfileRepository studentProfileRepository,
        IReviewRepository reviewRepository)
    {
        _enrollmentRepository = enrollmentRepository;
        _studentProfileRepository = studentProfileRepository;
        _reviewRepository = reviewRepository;
    }

    public async Task<ReviewEligibilityResponse> GetEnrollmentReviewEligibilityAsync(
        string authUserId, Guid enrollmentId, CancellationToken cancellationToken)
    {
        var student = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Student profile not found.");

        var enrollment = await _enrollmentRepository.GetByIdAsync(enrollmentId, cancellationToken)
            ?? throw new InvalidOperationException("Enrollment not found.");

        if (enrollment.StudentProfileId != student.Id)
        {
            throw new UnauthorizedAccessException("This enrollment does not belong to you.");
        }

        return await EvaluateAsync(enrollment, cancellationToken);
    }

    public async Task<IReadOnlyCollection<EnrollmentReviewPromptResponse>> GetPendingReviewPromptsAsync(
        string authUserId, CancellationToken cancellationToken)
    {
        var student = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Student profile not found.");

        var enrollments = await _enrollmentRepository.GetByStudentAsync(student.Id, cancellationToken);
        var prompts = new List<EnrollmentReviewPromptResponse>();

        foreach (var enrollment in enrollments)
        {
            var eligibility = await EvaluateAsync(enrollment, cancellationToken);
            prompts.Add(new EnrollmentReviewPromptResponse
            {
                EnrollmentId = enrollment.Id,
                TutorProfileId = enrollment.TutorProfileId,
                TutorName = enrollment.TutorProfile?.UserAccount?.FullName ?? "Tutor",
                BatchTitle = enrollment.TutorBatch?.Title ?? enrollment.Subject,
                Subject = enrollment.Subject,
                Status = enrollment.Status.ToString(),
                DaysRemaining = eligibility.DaysRemaining ?? 0,
                CanReview = eligibility.CanReview,
                Reason = eligibility.Reason,
                AlreadyReviewed = eligibility.ExistingReviewId.HasValue,
                EndDateUtc = enrollment.EndDateUtc,
            });
        }

        return prompts;
    }

    private async Task<ReviewEligibilityResponse> EvaluateAsync(
        Domain.Entities.BatchEnrollment enrollment, CancellationToken cancellationToken)
    {
        var existing = await _reviewRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken);
        if (existing is not null)
        {
            return new ReviewEligibilityResponse
            {
                CanReview = false,
                Reason = "You have already submitted a review for this course.",
                ExistingReviewId = existing.Id,
                DaysRemaining = 0,
            };
        }

        if (enrollment.Status is not BatchEnrollmentStatus.Completed
            and not BatchEnrollmentStatus.Expired
            and not BatchEnrollmentStatus.Withdrawn)
        {
            return new ReviewEligibilityResponse
            {
                CanReview = false,
                Reason = "Reviews are available after your course is completed, expires, or you withdraw under the early-leave policy.",
            };
        }

        var anchor = GetReviewAnchorUtc(enrollment);
        var windowEnd = anchor.AddDays(ReviewWindowDays);
        var now = DateTime.UtcNow;

        if (now > windowEnd)
        {
            return new ReviewEligibilityResponse
            {
                CanReview = false,
                Reason = "The 10-day review window has closed.",
                DaysRemaining = 0,
            };
        }

        var daysLeft = (int)Math.Ceiling((windowEnd - now).TotalDays);
        return new ReviewEligibilityResponse
        {
            CanReview = true,
            DaysRemaining = Math.Max(0, daysLeft),
        };
    }

    private static DateTime GetReviewAnchorUtc(Domain.Entities.BatchEnrollment enrollment)
    {
        if (enrollment.Status == BatchEnrollmentStatus.Withdrawn)
        {
            return enrollment.CompletionDateUtc
                ?? enrollment.WithdrawalRequestedAtUtc
                ?? enrollment.EffectiveEndDateUtc
                ?? enrollment.EndDateUtc;
        }

        return enrollment.CompletionDateUtc ?? enrollment.EndDateUtc;
    }
}
