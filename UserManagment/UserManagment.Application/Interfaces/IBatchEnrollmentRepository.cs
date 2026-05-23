using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Interfaces;

public interface IBatchEnrollmentRepository
{
    Task<BatchEnrollment?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<BatchEnrollment>> GetByStudentAsync(Guid studentProfileId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<BatchEnrollment>> GetByTutorAsync(Guid tutorProfileId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<BatchEnrollment>> GetByBatchAsync(Guid batchId, CancellationToken cancellationToken);
    Task<int> CountActiveByBatchAsync(Guid batchId, CancellationToken cancellationToken);
    Task<bool> HasActiveEnrollmentAsync(
        Guid studentProfileId,
        Guid tutorProfileId,
        string subject,
        DateTime periodStartUtc,
        DateTime periodEndUtc,
        Guid? excludeEnrollmentId,
        CancellationToken cancellationToken);

    Task<BatchEnrollment?> GetActiveSameTutorSubjectEnrollmentAsync(
        Guid studentProfileId,
        Guid tutorProfileId,
        string subject,
        DateTime periodStartUtc,
        DateTime periodEndUtc,
        Guid? excludeEnrollmentId,
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<BatchEnrollment>> GetActiveEnrollmentsWithBatchesAsync(
        Guid studentProfileId,
        Guid? excludeEnrollmentId,
        CancellationToken cancellationToken);

    /// <summary>
    /// Returns true when the given tutor has at least one (any-status) enrollment for the student.
    /// Used to authorise tutor reads of a student's progress / assessments.
    /// </summary>
    Task<bool> HasAnyForTutorAndStudentAsync(
        Guid tutorProfileId,
        Guid studentProfileId,
        CancellationToken cancellationToken);

    Task AddAsync(BatchEnrollment enrollment, CancellationToken cancellationToken);
    Task UpdateAsync(BatchEnrollment enrollment, CancellationToken cancellationToken);
    Task ExpirePastEnrollmentsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Guid>> GetActiveEndedEnrollmentIdsAsync(CancellationToken cancellationToken);
}
