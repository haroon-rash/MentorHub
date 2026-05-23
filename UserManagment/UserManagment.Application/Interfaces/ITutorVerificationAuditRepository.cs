using UserManagment.Domain.Entities;

namespace UserManagment.Application.Interfaces;

public interface ITutorVerificationAuditRepository
{
    Task AddAsync(TutorVerificationAudit audit, CancellationToken cancellationToken);
}
