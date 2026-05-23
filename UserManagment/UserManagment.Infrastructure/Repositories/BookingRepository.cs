using Microsoft.EntityFrameworkCore;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.Infrastructure.Repositories;

public class BookingRepository : IBookingRepository
{
    private readonly UserManagmentDbContext _context;

    public BookingRepository(UserManagmentDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Booking booking, CancellationToken cancellationToken)
    {
        await _context.Bookings.AddAsync(booking, cancellationToken);
    }

    public async Task<IReadOnlyCollection<Booking>> GetByStudentIdAsync(Guid studentId, CancellationToken cancellationToken)
    {
        return await _context.Bookings
            .Include(b => b.TutorProfile)
            .ThenInclude(t => t.UserAccount)
            .Where(b => b.StudentProfileId == studentId)
            .OrderByDescending(b => b.BookingDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<Booking>> GetByTutorIdAsync(Guid tutorId, CancellationToken cancellationToken)
    {
        return await _context.Bookings
            .Include(b => b.StudentProfile)
            .ThenInclude(s => s.UserAccount)
            .Where(b => b.TutorProfileId == tutorId)
            .OrderByDescending(b => b.BookingDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<Booking>> GetByTutorAndDateAsync(Guid tutorId, DateTime date, CancellationToken cancellationToken)
    {
        return await _context.Bookings
            .Where(b => b.TutorProfileId == tutorId && b.BookingDate.Date == date.Date)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<Booking>> GetByStudentAndDateAsync(Guid studentId, DateTime date, CancellationToken cancellationToken)
    {
        return await _context.Bookings
            .Where(b => b.StudentProfileId == studentId && b.BookingDate.Date == date.Date)
            .ToListAsync(cancellationToken);
    }

    public async Task<Booking?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _context.Bookings
            .Include(b => b.TutorProfile)
            .ThenInclude(t => t.UserAccount)
            .Include(b => b.StudentProfile)
            .ThenInclude(s => s.UserAccount)
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyCollection<Booking>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await _context.Bookings
            .Include(b => b.TutorProfile)
            .ThenInclude(t => t.UserAccount)
            .Include(b => b.StudentProfile)
            .ThenInclude(s => s.UserAccount)
            .OrderByDescending(b => b.BookingDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> CountAllAsync(CancellationToken cancellationToken)
    {
        return await _context.Bookings.CountAsync(cancellationToken);
    }

    public async Task<decimal> GetTotalRevenueAsync(CancellationToken cancellationToken)
    {
        return await _context.Bookings
            .Where(b => b.Status == UserManagment.Domain.Enums.BookingStatus.Completed)
            .SumAsync(b => b.Fee, cancellationToken);
    }

    public async Task<decimal> GetAverageFeeAsync(CancellationToken cancellationToken)
    {
        var hasCompleted = await _context.Bookings.AnyAsync(b => b.Status == UserManagment.Domain.Enums.BookingStatus.Completed, cancellationToken);
        if (!hasCompleted) return 0;

        return await _context.Bookings
            .Where(b => b.Status == UserManagment.Domain.Enums.BookingStatus.Completed)
            .AverageAsync(b => b.Fee, cancellationToken);
    }

    public async Task<int> CountByStatusAsync(UserManagment.Domain.Enums.BookingStatus status, CancellationToken cancellationToken)
    {
        return await _context.Bookings.CountAsync(b => b.Status == status, cancellationToken);
    }

    public Task UpdateAsync(Booking booking, CancellationToken cancellationToken)
    {
        _context.Bookings.Update(booking);
        return Task.CompletedTask;
    }

    public async Task<bool> HasCompletedBookingAsync(Guid studentId, Guid tutorId, CancellationToken cancellationToken)
    {
        return await _context.Bookings.AnyAsync(b => 
            b.StudentProfileId == studentId && 
            b.TutorProfileId == tutorId && 
            b.Status == UserManagment.Domain.Enums.BookingStatus.Completed, 
            cancellationToken);
    }

    public async Task<bool> HasActiveBookingBetweenAsync(string authUserId1, string authUserId2, CancellationToken cancellationToken)
    {
        var activeBookingStatuses = new[]
        {
            UserManagment.Domain.Enums.BookingStatus.Pending,
            UserManagment.Domain.Enums.BookingStatus.Confirmed,
            UserManagment.Domain.Enums.BookingStatus.Completed,
        };

        var hasBooking = await (
            from b in _context.Bookings
            join sp in _context.StudentProfiles on b.StudentProfileId equals sp.Id
            join su in _context.UserAccounts on sp.UserAccountId equals su.Id
            join tp in _context.TutorProfiles on b.TutorProfileId equals tp.Id
            join tu in _context.UserAccounts on tp.UserAccountId equals tu.Id
            where activeBookingStatuses.Contains(b.Status)
                  && ((su.AuthUserId == authUserId1 && tu.AuthUserId == authUserId2)
                      || (su.AuthUserId == authUserId2 && tu.AuthUserId == authUserId1))
            select b.Id
        ).AnyAsync(cancellationToken);

        if (hasBooking)
        {
            return true;
        }

        var activeEnrollmentStatuses = new[]
        {
            UserManagment.Domain.Enums.BatchEnrollmentStatus.Pending,
            UserManagment.Domain.Enums.BatchEnrollmentStatus.Active,
        };

        return await (
            from e in _context.BatchEnrollments
            join sp in _context.StudentProfiles on e.StudentProfileId equals sp.Id
            join su in _context.UserAccounts on sp.UserAccountId equals su.Id
            join tp in _context.TutorProfiles on e.TutorProfileId equals tp.Id
            join tu in _context.UserAccounts on tp.UserAccountId equals tu.Id
            where activeEnrollmentStatuses.Contains(e.Status)
                  && ((su.AuthUserId == authUserId1 && tu.AuthUserId == authUserId2)
                      || (su.AuthUserId == authUserId2 && tu.AuthUserId == authUserId1))
            select e.Id
        ).AnyAsync(cancellationToken);
    }
}
