using Microsoft.EntityFrameworkCore;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.Infrastructure.Repositories;

public class EnrollmentBillingPeriodRepository : IEnrollmentBillingPeriodRepository
{
    private readonly UserManagmentDbContext _db;

    public EnrollmentBillingPeriodRepository(UserManagmentDbContext db) => _db = db;

    public async Task<IReadOnlyCollection<EnrollmentBillingPeriod>> GetByEnrollmentAsync(
        Guid enrollmentId, CancellationToken cancellationToken) =>
        await _db.EnrollmentBillingPeriods
            .Where(p => p.BatchEnrollmentId == enrollmentId)
            .OrderBy(p => p.PeriodIndex)
            .ToArrayAsync(cancellationToken);

    public async Task AddRangeAsync(IEnumerable<EnrollmentBillingPeriod> periods, CancellationToken cancellationToken) =>
        await _db.EnrollmentBillingPeriods.AddRangeAsync(periods, cancellationToken);

    public Task UpdateRangeAsync(IEnumerable<EnrollmentBillingPeriod> periods, CancellationToken cancellationToken)
    {
        _db.EnrollmentBillingPeriods.UpdateRange(periods);
        return Task.CompletedTask;
    }
}
