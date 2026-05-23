using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;

namespace UserManagment.Application.Interfaces;

public interface ITutorOnboardingService
{
    Task<TutorProfileResponse> UpsertTutorProfileAsync(
        string authUserId,
        string authenticatedEmail,
        TutorOnboardingRequest request,
        CancellationToken cancellationToken);
    Task<TutorProfileResponse?> GetTutorProfileAsync(string authUserId, CancellationToken cancellationToken);
    Task<TutorProfileResponse?> GetTutorProfileByEmailAsync(string email, CancellationToken cancellationToken);
}
