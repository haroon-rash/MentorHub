using Microsoft.EntityFrameworkCore;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.Infrastructure.Repositories;

public class ReviewRepository : IReviewRepository
{
    private readonly UserManagmentDbContext _context;

    public ReviewRepository(UserManagmentDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Review review, CancellationToken cancellationToken)
    {
        await _context.Reviews.AddAsync(review, cancellationToken);
    }

    public async Task<IReadOnlyCollection<Review>> GetByTutorIdAsync(Guid tutorProfileId, CancellationToken cancellationToken)
    {
        return await _context.Reviews
            .Include(r => r.StudentProfile)
            .ThenInclude(s => s.UserAccount)
            .Where(r => r.TutorProfileId == tutorProfileId)
            .OrderByDescending(r => r.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> ExistsForBookingAsync(Guid bookingId, CancellationToken cancellationToken)
    {
        return await _context.Reviews.AnyAsync(r => r.BookingId == bookingId, cancellationToken);
    }

    public Task<bool> ExistsForEnrollmentAsync(Guid enrollmentId, CancellationToken cancellationToken) =>
        _context.Reviews.AnyAsync(r => r.BatchEnrollmentId == enrollmentId, cancellationToken);

    public Task<Review?> GetByEnrollmentIdAsync(Guid enrollmentId, CancellationToken cancellationToken) =>
        _context.Reviews.FirstOrDefaultAsync(r => r.BatchEnrollmentId == enrollmentId, cancellationToken);
}
