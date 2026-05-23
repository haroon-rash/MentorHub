using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;

namespace UserManagment.Application.Interfaces;

public interface ISuperAdminVerificationService
{
    Task<SuperAdminDashboardResponse> GetDashboardAsync(CancellationToken cancellationToken);
    Task<IReadOnlyCollection<TutorRequestSummaryResponse>> GetTutorRequestsAsync(string? status, CancellationToken cancellationToken);
    Task<TutorRequestSummaryResponse> ReviewTutorAsync(string adminId, Guid tutorProfileId, TutorVerificationDecisionRequest request, CancellationToken cancellationToken);
    Task<PagedResponse<UserDirectoryResponse>> GetUsersAsync(int skip, int take, string? search, CancellationToken cancellationToken);
    Task DeleteUserAsync(Guid id, CancellationToken cancellationToken);
}
