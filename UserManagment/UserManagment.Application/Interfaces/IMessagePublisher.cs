namespace UserManagment.Application.Interfaces;

public interface IMessagePublisher
{
    Task PublishUserProfileCreatedAsync(string authUserId, string email, string fullName, CancellationToken cancellationToken);
    Task PublishTutorReviewedAsync(
        Guid tutorProfileId,
        string authUserId,
        string fullName,
        string email,
        string verificationStatus,
        string profilePhotoUrl,
        string highestDegree,
        int yearsOfExperience,
        decimal hourlyFee,
        string subjectsCsv,
        string bio,
        string teachingMethodology,
        string teachingMode,
        string inPersonLocation,
        DateTime? reviewedAtUtc,
        CancellationToken cancellationToken);
    Task PublishTutorApprovedAsync(
        Guid tutorProfileId,
        string authUserId,
        string fullName,
        string email,
        string verificationStatus,
        string notes,
        DateTime? reviewedAtUtc,
        CancellationToken cancellationToken);
    Task PublishTutorRejectedAsync(
        Guid tutorProfileId,
        string authUserId,
        string fullName,
        string email,
        string verificationStatus,
        string rejectionReason,
        DateTime? reviewedAtUtc,
        CancellationToken cancellationToken);
    Task PublishNotificationEmailSendAsync(string email, string subject, string body, CancellationToken cancellationToken);
}
