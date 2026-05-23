using UserManagment.Domain.Entities;

namespace UserManagment.Application.Interfaces;

public interface IReviewRepository
{
    Task AddAsync(Review review, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Review>> GetByTutorIdAsync(Guid tutorProfileId, CancellationToken cancellationToken);
    Task<bool> ExistsForBookingAsync(Guid bookingId, CancellationToken cancellationToken);
    Task<bool> ExistsForEnrollmentAsync(Guid enrollmentId, CancellationToken cancellationToken);
    Task<Review?> GetByEnrollmentIdAsync(Guid enrollmentId, CancellationToken cancellationToken);
}
