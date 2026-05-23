using Microsoft.EntityFrameworkCore;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.Infrastructure.Repositories;

public class BatchEnrollmentRepository : IBatchEnrollmentRepository
{
    private readonly UserManagmentDbContext _db;

    public BatchEnrollmentRepository(UserManagmentDbContext db) => _db = db;

    public Task<BatchEnrollment?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        _db.BatchEnrollments
            .Include(e => e.TutorBatch)
            .Include(e => e.BillingPeriods)
            .Include(e => e.StudentProfile).ThenInclude(s => s.UserAccount)
            .Include(e => e.TutorProfile).ThenInclude(t => t.UserAccount)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

    public async Task<IReadOnlyCollection<BatchEnrollment>> GetByStudentAsync(Guid studentProfileId, CancellationToken cancellationToken) =>
        await _db.BatchEnrollments
            .Include(e => e.TutorBatch)
            .Include(e => e.TutorProfile).ThenInclude(t => t.UserAccount)
            .Where(e => e.StudentProfileId == studentProfileId)
            .OrderByDescending(e => e.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);

    public async Task<IReadOnlyCollection<BatchEnrollment>> GetByTutorAsync(Guid tutorProfileId, CancellationToken cancellationToken) =>
        await _db.BatchEnrollments
            .Include(e => e.TutorBatch)
            .Include(e => e.StudentProfile).ThenInclude(s => s.UserAccount)
            .Where(e => e.TutorProfileId == tutorProfileId)
            .OrderByDescending(e => e.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);

    public async Task<IReadOnlyCollection<BatchEnrollment>> GetByBatchAsync(Guid batchId, CancellationToken cancellationToken) =>
        await _db.BatchEnrollments
            .Include(e => e.StudentProfile).ThenInclude(s => s.UserAccount)
            .Where(e => e.TutorBatchId == batchId)
            .ToArrayAsync(cancellationToken);

    public Task<int> CountActiveByBatchAsync(Guid batchId, CancellationToken cancellationToken) =>
        _db.BatchEnrollments.CountAsync(
            e => e.TutorBatchId == batchId &&
                 (e.Status == BatchEnrollmentStatus.Active || e.Status == BatchEnrollmentStatus.Pending),
            cancellationToken);

    public async Task<bool> HasActiveEnrollmentAsync(
        Guid studentProfileId,
        Guid tutorProfileId,
        string subject,
        DateTime periodStartUtc,
        DateTime periodEndUtc,
        Guid? excludeEnrollmentId,
        CancellationToken cancellationToken)
    {
        var normalizedSubject = subject.Trim().ToLowerInvariant();
        var activeStatuses = new[] { BatchEnrollmentStatus.Pending, BatchEnrollmentStatus.Active };
        var now = DateTime.UtcNow;

        var query = _db.BatchEnrollments.Where(e =>
            e.StudentProfileId == studentProfileId &&
            e.TutorProfileId == tutorProfileId &&
            e.Subject.ToLower() == normalizedSubject &&
            activeStatuses.Contains(e.Status) &&
            e.EndDateUtc >= now &&
            e.StartDateUtc <= periodEndUtc &&
            e.EndDateUtc >= periodStartUtc);

        if (excludeEnrollmentId.HasValue)
        {
            query = query.Where(e => e.Id != excludeEnrollmentId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    public async Task<BatchEnrollment?> GetActiveSameTutorSubjectEnrollmentAsync(
        Guid studentProfileId,
        Guid tutorProfileId,
        string subject,
        DateTime periodStartUtc,
        DateTime periodEndUtc,
        Guid? excludeEnrollmentId,
        CancellationToken cancellationToken)
    {
        var normalizedSubject = subject.Trim().ToLowerInvariant();
        var activeStatuses = new[] { BatchEnrollmentStatus.Pending, BatchEnrollmentStatus.Active };
        var now = DateTime.UtcNow;

        var query = _db.BatchEnrollments
            .Include(e => e.TutorProfile).ThenInclude(t => t.UserAccount)
            .Where(e =>
                e.StudentProfileId == studentProfileId &&
                e.TutorProfileId == tutorProfileId &&
                e.Subject.ToLower() == normalizedSubject &&
                activeStatuses.Contains(e.Status) &&
                e.EndDateUtc >= now &&
                e.StartDateUtc <= periodEndUtc &&
                e.EndDateUtc >= periodStartUtc);

        if (excludeEnrollmentId.HasValue)
        {
            query = query.Where(e => e.Id != excludeEnrollmentId.Value);
        }

        return await query.FirstOrDefaultAsync(cancellationToken);
    }

    public Task<bool> HasAnyForTutorAndStudentAsync(
        Guid tutorProfileId,
        Guid studentProfileId,
        CancellationToken cancellationToken) =>
        _db.BatchEnrollments
            .AnyAsync(
                e => e.TutorProfileId == tutorProfileId && e.StudentProfileId == studentProfileId,
                cancellationToken);

    public async Task<IReadOnlyCollection<BatchEnrollment>> GetActiveEnrollmentsWithBatchesAsync(
        Guid studentProfileId,
        Guid? excludeEnrollmentId,
        CancellationToken cancellationToken)
    {
        var activeStatuses = new[] { BatchEnrollmentStatus.Pending, BatchEnrollmentStatus.Active };
        var now = DateTime.UtcNow;

        var query = _db.BatchEnrollments
            .Include(e => e.TutorBatch)
            .Include(e => e.TutorProfile).ThenInclude(t => t.UserAccount)
            .Where(e =>
                e.StudentProfileId == studentProfileId &&
                activeStatuses.Contains(e.Status) &&
                e.EndDateUtc >= now);

        if (excludeEnrollmentId.HasValue)
        {
            query = query.Where(e => e.Id != excludeEnrollmentId.Value);
        }

        return await query.ToArrayAsync(cancellationToken);
    }

    public async Task AddAsync(BatchEnrollment enrollment, CancellationToken cancellationToken) =>
        await _db.BatchEnrollments.AddAsync(enrollment, cancellationToken);

    public Task UpdateAsync(BatchEnrollment enrollment, CancellationToken cancellationToken)
    {
        _db.BatchEnrollments.Update(enrollment);
        return Task.CompletedTask;
    }

    public async Task ExpirePastEnrollmentsAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var expired = await _db.BatchEnrollments
            .Where(e => e.Status == BatchEnrollmentStatus.Active && e.EndDateUtc < now)
            .ToListAsync(cancellationToken);

        foreach (var e in expired)
        {
            e.Status = BatchEnrollmentStatus.Expired;
            if (!e.CompletionDateUtc.HasValue)
            {
                e.CompletionDateUtc = e.EndDateUtc;
            }
            e.UpdatedAtUtc = now;
        }
    }

    public async Task<IReadOnlyCollection<Guid>> GetActiveEndedEnrollmentIdsAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        return await _db.BatchEnrollments
            .Where(e => e.Status == BatchEnrollmentStatus.Active && e.EndDateUtc < now)
            .Select(e => e.Id)
            .ToArrayAsync(cancellationToken);
    }
}
