using UserManagment.Domain.Entities;

namespace UserManagment.Application.Interfaces;

public interface IEnrollmentBillingPeriodRepository
{
    Task<IReadOnlyCollection<EnrollmentBillingPeriod>> GetByEnrollmentAsync(Guid enrollmentId, CancellationToken cancellationToken);
    Task AddRangeAsync(IEnumerable<EnrollmentBillingPeriod> periods, CancellationToken cancellationToken);
    Task UpdateRangeAsync(IEnumerable<EnrollmentBillingPeriod> periods, CancellationToken cancellationToken);
}
