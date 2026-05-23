using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;

namespace UserManagment.Application.Interfaces;

public interface IBatchEnrollmentService
{
    Task<BatchEnrollmentResponse> EnrollInBatchAsync(string authUserId, Guid batchId, EnrollInBatchRequest request, CancellationToken cancellationToken);
    Task<BatchEnrollmentResponse> EnrollInPackageAsync(string authUserId, CreatePackageEnrollmentRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<BatchEnrollmentResponse>> GetMyEnrollmentsAsync(string authUserId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<BatchEnrollmentResponse>> GetTutorEnrollmentsAsync(string authUserId, Guid? batchId, CancellationToken cancellationToken);
    Task CancelEnrollmentAsync(string authUserId, Guid enrollmentId, string? reason, string activeRole, CancellationToken cancellationToken);
    Task<EnrollmentEligibilityResponse> CanEnrollAsync(
        Guid studentProfileId,
        Guid tutorProfileId,
        string subject,
        DateTime start,
        DateTime end,
        string daysOfWeekCsv,
        string startTime,
        string endTime,
        CancellationToken cancellationToken);

    Task<EnrollmentEligibilityResponse> CanEnrollInBatchAsync(
        Guid studentProfileId,
        Guid batchId,
        CancellationToken cancellationToken);

    Task<EnrolledStudentDetailResponse> GetEnrolledStudentDetailAsync(
        string authUserId, Guid studentProfileId, Guid? batchId, CancellationToken cancellationToken);
}
