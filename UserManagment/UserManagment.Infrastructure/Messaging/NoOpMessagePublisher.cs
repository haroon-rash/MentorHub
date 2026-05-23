using Microsoft.Extensions.Logging;
using UserManagment.Application.Interfaces;

namespace UserManagment.Infrastructure.Messaging;

/// <summary>
/// No-op implementation of IMessagePublisher.
/// RabbitMQ has been removed from the project.
/// All inter-service communication now uses REST calls via the Java microservices.
/// </summary>
public class NoOpMessagePublisher : IMessagePublisher
{
    private readonly ILogger<NoOpMessagePublisher> _logger;

    public NoOpMessagePublisher(ILogger<NoOpMessagePublisher> logger)
    {
        _logger = logger;
    }

    public Task PublishUserProfileCreatedAsync(string authUserId, string email, string fullName, CancellationToken cancellationToken)
    {
        _logger.LogDebug("NoOp: UserProfileCreated for {Email} — handled via shared database", email);
        return Task.CompletedTask;
    }

    public Task PublishTutorReviewedAsync(
        Guid tutorProfileId, string authUserId, string fullName, string email,
        string verificationStatus, string profilePhotoUrl, string highestDegree,
        int yearsOfExperience, decimal hourlyFee, string subjectsCsv, string bio,
        string teachingMethodology, string teachingMode, string inPersonLocation,
        DateTime? reviewedAtUtc, CancellationToken cancellationToken)
    {
        _logger.LogDebug("NoOp: TutorReviewed for {TutorProfileId} — handled via admin-service REST", tutorProfileId);
        return Task.CompletedTask;
    }

    public Task PublishTutorApprovedAsync(
        Guid tutorProfileId, string authUserId, string fullName, string email,
        string verificationStatus, string notes, DateTime? reviewedAtUtc, CancellationToken cancellationToken)
    {
        _logger.LogDebug("NoOp: TutorApproved for {TutorProfileId} — handled via admin-service REST", tutorProfileId);
        return Task.CompletedTask;
    }

    public Task PublishTutorRejectedAsync(
        Guid tutorProfileId, string authUserId, string fullName, string email,
        string verificationStatus, string rejectionReason, DateTime? reviewedAtUtc, CancellationToken cancellationToken)
    {
        _logger.LogDebug("NoOp: TutorRejected for {TutorProfileId} — handled via admin-service REST", tutorProfileId);
        return Task.CompletedTask;
    }

    public Task PublishNotificationEmailSendAsync(string email, string subject, string body, CancellationToken cancellationToken)
    {
        _logger.LogDebug("NoOp: NotificationEmailSend to {Email} — handled via notification-service REST", email);
        return Task.CompletedTask;
    }
}
