using UserManagment.Domain.Entities;

namespace UserManagment.Application.Interfaces;

public interface ITutorApprovedCatalogSync
{
    Task SyncAfterReviewAsync(TutorProfile profile, CancellationToken cancellationToken = default);
}
