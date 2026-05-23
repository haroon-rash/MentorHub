using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Domain.Entities;

namespace UserManagment.Application.Interfaces;

public interface IEnrollmentBillingService
{
    Task GenerateBillingPeriodsAsync(BatchEnrollment enrollment, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<BillingPeriodResponse>> GetBillingPeriodsAsync(
        string authUserId, Guid enrollmentId, string activeRole, CancellationToken cancellationToken);
    Task<WithdrawalPreviewResponse> PreviewWithdrawalAsync(
        string authUserId, Guid enrollmentId, DateTime requestedLeaveDateUtc, string activeRole, CancellationToken cancellationToken);
    Task<WithdrawalPreviewResponse> ConfirmWithdrawalAsync(
        string authUserId, Guid enrollmentId, WithdrawEnrollmentRequest request, string activeRole, CancellationToken cancellationToken);
}
