using UserManagment.Application.Contracts.Responses;

namespace UserManagment.Application.Interfaces;

public interface IReviewEligibilityService
{
    Task<ReviewEligibilityResponse> GetEnrollmentReviewEligibilityAsync(
        string authUserId, Guid enrollmentId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<EnrollmentReviewPromptResponse>> GetPendingReviewPromptsAsync(
        string authUserId, CancellationToken cancellationToken);
}

public class EnrollmentReviewPromptResponse
{
    public Guid EnrollmentId { get; set; }
    public Guid TutorProfileId { get; set; }
    public string TutorName { get; set; } = string.Empty;
    public string BatchTitle { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int DaysRemaining { get; set; }
    public bool CanReview { get; set; }
    public string? Reason { get; set; }
    public bool AlreadyReviewed { get; set; }
    public DateTime? EndDateUtc { get; set; }
}
