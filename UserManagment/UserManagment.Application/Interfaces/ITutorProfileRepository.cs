using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Interfaces;

public interface ITutorProfileRepository
{
    Task<TutorProfile?> GetByAuthUserIdAsync(string authUserId, CancellationToken cancellationToken);
    Task<TutorProfile?> GetByIdAsync(Guid tutorProfileId, CancellationToken cancellationToken);
    Task<TutorProfile?> GetByUserAccountIdAsync(Guid userAccountId, CancellationToken cancellationToken);
    Task AddAsync(TutorProfile tutorProfile, CancellationToken cancellationToken);
    Task UpdateAsync(TutorProfile tutorProfile, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<TutorProfile>> GetTutorRequestsAsync(TutorVerificationStatus? status, CancellationToken cancellationToken);
    Task<int> CountAsync(TutorVerificationStatus? status, CancellationToken cancellationToken);
}
