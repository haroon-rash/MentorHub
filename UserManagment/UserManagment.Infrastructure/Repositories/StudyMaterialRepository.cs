using Microsoft.EntityFrameworkCore;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.Infrastructure.Repositories;

public class StudyMaterialRepository : IStudyMaterialRepository
{
    private readonly UserManagmentDbContext _db;

    public StudyMaterialRepository(UserManagmentDbContext db) => _db = db;

    public Task<StudyMaterial?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        _db.StudyMaterials
            .Include(m => m.TutorBatch)
            .Include(m => m.TutorProfile).ThenInclude(t => t.UserAccount)
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken);

    public async Task<IReadOnlyCollection<StudyMaterial>> GetByTutorAsync(Guid tutorProfileId, CancellationToken cancellationToken) =>
        await _db.StudyMaterials
            .Include(m => m.TutorBatch)
            .Where(m => m.TutorProfileId == tutorProfileId && !m.IsDeleted)
            .OrderByDescending(m => m.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);

    public async Task<IReadOnlyCollection<StudyMaterial>> GetForStudentAsync(Guid studentProfileId, CancellationToken cancellationToken)
    {
        var enrollments = await _db.BatchEnrollments
            .Where(e => e.StudentProfileId == studentProfileId &&
                        (e.Status == BatchEnrollmentStatus.Active || e.Status == BatchEnrollmentStatus.Pending))
            .Select(e => new { e.TutorBatchId, e.Subject, e.TutorProfileId })
            .ToListAsync(cancellationToken);

        var batchIds = enrollments.Select(e => e.TutorBatchId).ToHashSet();
        var enrollmentSubjects = enrollments
            .Select(e => e.Subject.Trim())
            .Where(s => s.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        var tutorIds = enrollments.Select(e => e.TutorProfileId).ToHashSet();

        var activeBookingStatuses = new[]
        {
            BookingStatus.Pending,
            BookingStatus.Confirmed,
            BookingStatus.Completed,
        };
        var bookingAccess = await _db.Bookings
            .Where(b => b.StudentProfileId == studentProfileId && activeBookingStatuses.Contains(b.Status))
            .Select(b => new { b.TutorProfileId, Subject = b.Subject ?? string.Empty })
            .ToListAsync(cancellationToken);

        foreach (var b in bookingAccess)
            tutorIds.Add(b.TutorProfileId);

        var candidates = await _db.StudyMaterials
            .Include(m => m.TutorBatch)
            .Include(m => m.TutorProfile).ThenInclude(t => t.UserAccount)
            .Where(m => !m.IsDeleted && tutorIds.Contains(m.TutorProfileId))
            .OrderByDescending(m => m.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return candidates
            .Where(m =>
            {
                var hasBookingSubjectAccess = bookingAccess.Any(bl =>
                    bl.TutorProfileId == m.TutorProfileId
                    && string.Equals(bl.Subject.Trim(), m.Subject.Trim(), StringComparison.OrdinalIgnoreCase));

                if (m.TutorBatchId != null)
                {
                    if (batchIds.Contains(m.TutorBatchId.Value))
                        return true;
                    var batchSubject = m.TutorBatch?.Subject?.Trim() ?? m.Subject.Trim();
                    return bookingAccess.Any(bl =>
                        bl.TutorProfileId == m.TutorProfileId
                        && string.Equals(bl.Subject.Trim(), batchSubject, StringComparison.OrdinalIgnoreCase));
                }

                return enrollmentSubjects.Any(es => string.Equals(es, m.Subject, StringComparison.OrdinalIgnoreCase))
                    || hasBookingSubjectAccess;
            })
            .ToArray();
    }

    public async Task AddAsync(StudyMaterial material, CancellationToken cancellationToken) =>
        await _db.StudyMaterials.AddAsync(material, cancellationToken);

    public Task UpdateAsync(StudyMaterial material, CancellationToken cancellationToken)
    {
        _db.StudyMaterials.Update(material);
        return Task.CompletedTask;
    }
}
