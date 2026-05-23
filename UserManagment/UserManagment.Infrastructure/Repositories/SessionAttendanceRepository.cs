using Microsoft.EntityFrameworkCore;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.Infrastructure.Repositories;

public class SessionAttendanceRepository : ISessionAttendanceRepository
{
    private readonly UserManagmentDbContext _db;

    public SessionAttendanceRepository(UserManagmentDbContext db) => _db = db;

    public Task<SessionAttendance?> GetAsync(Guid sessionId, Guid studentProfileId, CancellationToken cancellationToken) =>
        _db.SessionAttendances.FirstOrDefaultAsync(
            a => a.GeneratedClassSessionId == sessionId && a.StudentProfileId == studentProfileId,
            cancellationToken);

    public async Task AddAsync(SessionAttendance record, CancellationToken cancellationToken) =>
        await _db.SessionAttendances.AddAsync(record, cancellationToken);

    public Task UpdateAsync(SessionAttendance record, CancellationToken cancellationToken)
    {
        _db.SessionAttendances.Update(record);
        return Task.CompletedTask;
    }
}
