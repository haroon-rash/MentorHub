using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Interfaces;

public interface IBookingRepository
{
    Task AddAsync(Booking booking, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Booking>> GetByStudentIdAsync(Guid studentId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Booking>> GetByTutorIdAsync(Guid tutorId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Booking>> GetByTutorAndDateAsync(Guid tutorId, DateTime date, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Booking>> GetByStudentAndDateAsync(Guid studentId, DateTime date, CancellationToken cancellationToken);
    Task<Booking?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Booking>> GetAllAsync(CancellationToken cancellationToken);
    Task<int> CountAllAsync(CancellationToken cancellationToken);
    Task<decimal> GetTotalRevenueAsync(CancellationToken cancellationToken);
    Task<decimal> GetAverageFeeAsync(CancellationToken cancellationToken);
    Task<int> CountByStatusAsync(BookingStatus status, CancellationToken cancellationToken);

    Task UpdateAsync(Booking booking, CancellationToken cancellationToken);
    
    Task<bool> HasCompletedBookingAsync(Guid studentId, Guid tutorId, CancellationToken cancellationToken);
    Task<bool> HasActiveBookingBetweenAsync(string authUserId1, string authUserId2, CancellationToken cancellationToken);
}
