using Microsoft.EntityFrameworkCore;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.Infrastructure.Repositories;

public class TutorBatchRepository : ITutorBatchRepository
{
    private readonly UserManagmentDbContext _db;

    public TutorBatchRepository(UserManagmentDbContext db) => _db = db;

    public Task<TutorBatch?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        _db.TutorBatches.FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted, cancellationToken);

    public Task<TutorBatch?> GetByIdWithSessionsAsync(Guid id, CancellationToken cancellationToken) =>
        _db.TutorBatches
            .Include(b => b.ClassSessions)
            .Include(b => b.Enrollments).ThenInclude(e => e.StudentProfile).ThenInclude(s => s.UserAccount)
            .FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted, cancellationToken);

    public async Task<IReadOnlyCollection<TutorBatch>> GetByTutorAsync(Guid tutorProfileId, CancellationToken cancellationToken) =>
        await _db.TutorBatches
            .Include(b => b.Enrollments)
            .Include(b => b.ClassSessions)
            .Where(b => b.TutorProfileId == tutorProfileId && !b.IsDeleted)
            .OrderByDescending(b => b.StartDateUtc)
            .ToArrayAsync(cancellationToken);

    public async Task<IReadOnlyCollection<TutorBatch>> GetPublishedByTutorAndSubjectAsync(Guid tutorProfileId, string subject, CancellationToken cancellationToken)
    {
        var norm = subject.Trim().ToLowerInvariant();
        return await _db.TutorBatches
            .Where(b => b.TutorProfileId == tutorProfileId && !b.IsDeleted && b.IsPublished &&
                        b.Subject.ToLower() == norm && b.EndDateUtc >= DateTime.UtcNow)
            .OrderBy(b => b.StartDateUtc)
            .ToArrayAsync(cancellationToken);
    }

    public async Task AddAsync(TutorBatch batch, CancellationToken cancellationToken) =>
        await _db.TutorBatches.AddAsync(batch, cancellationToken);

    public Task UpdateAsync(TutorBatch batch, CancellationToken cancellationToken)
    {
        _db.TutorBatches.Update(batch);
        return Task.CompletedTask;
    }

    public async Task AddSessionsAsync(IEnumerable<GeneratedClassSession> sessions, CancellationToken cancellationToken) =>
        await _db.GeneratedClassSessions.AddRangeAsync(sessions, cancellationToken);

    public async Task ReplaceSessionsAsync(Guid batchId, IEnumerable<GeneratedClassSession> sessions, CancellationToken cancellationToken)
    {
        var existing = await _db.GeneratedClassSessions.Where(s => s.TutorBatchId == batchId).ToListAsync(cancellationToken);
        _db.GeneratedClassSessions.RemoveRange(existing);
        await _db.GeneratedClassSessions.AddRangeAsync(sessions, cancellationToken);
    }

    public async Task CancelSessionsAfterDateAsync(Guid batchId, DateTime afterDateUtc, CancellationToken cancellationToken)
    {
        var sessions = await _db.GeneratedClassSessions
            .Where(s => s.TutorBatchId == batchId && s.SessionDateUtc.Date > afterDateUtc.Date)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var session in sessions)
        {
            session.Status = ClassSessionStatus.Cancelled;
            session.UpdatedAtUtc = now;
        }
    }

    public async Task CompleteScheduledSessionsUpToAsync(Guid batchId, DateTime upToDateUtc, CancellationToken cancellationToken)
    {
        var sessions = await _db.GeneratedClassSessions
            .Where(s => s.TutorBatchId == batchId &&
                        s.Status == ClassSessionStatus.Scheduled &&
                        s.SessionDateUtc <= upToDateUtc)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var session in sessions)
        {
            session.Status = ClassSessionStatus.Completed;
            session.UpdatedAtUtc = now;
        }
    }

    public Task<GeneratedClassSession?> GetSessionByIdAsync(Guid sessionId, CancellationToken cancellationToken) =>
        _db.GeneratedClassSessions.FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

    public Task UpdateSessionAsync(GeneratedClassSession session, CancellationToken cancellationToken)
    {
        _db.GeneratedClassSessions.Update(session);
        return Task.CompletedTask;
    }
}
