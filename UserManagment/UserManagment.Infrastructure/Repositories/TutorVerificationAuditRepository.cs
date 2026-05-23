using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.Infrastructure.Repositories;

public class TutorVerificationAuditRepository : ITutorVerificationAuditRepository
{
    private readonly UserManagmentDbContext _dbContext;

    public TutorVerificationAuditRepository(UserManagmentDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(TutorVerificationAudit audit, CancellationToken cancellationToken)
    {
        await _dbContext.TutorVerificationAudits.AddAsync(audit, cancellationToken);
    }
}
