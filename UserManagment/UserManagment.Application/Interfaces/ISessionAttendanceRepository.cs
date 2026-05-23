using UserManagment.Domain.Entities;

namespace UserManagment.Application.Interfaces;

public interface ISessionAttendanceRepository
{
    Task<SessionAttendance?> GetAsync(Guid sessionId, Guid studentProfileId, CancellationToken cancellationToken);
    Task AddAsync(SessionAttendance record, CancellationToken cancellationToken);
    Task UpdateAsync(SessionAttendance record, CancellationToken cancellationToken);
}
