using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;

namespace UserManagment.Application.Interfaces;

public interface IStudentOnboardingService
{
    Task<StudentProfileResponse> UpsertStudentProfileAsync(string authUserId, StudentOnboardingRequest request, CancellationToken cancellationToken);
    Task<StudentProfileResponse?> GetStudentProfileAsync(string authUserId, CancellationToken cancellationToken);
}
