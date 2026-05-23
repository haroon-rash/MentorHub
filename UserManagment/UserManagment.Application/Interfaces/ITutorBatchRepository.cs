using UserManagment.Domain.Entities;

namespace UserManagment.Application.Interfaces;

public interface ITutorBatchRepository
{
    Task<TutorBatch?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<TutorBatch?> GetByIdWithSessionsAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<TutorBatch>> GetByTutorAsync(Guid tutorProfileId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<TutorBatch>> GetPublishedByTutorAndSubjectAsync(Guid tutorProfileId, string subject, CancellationToken cancellationToken);
    Task AddAsync(TutorBatch batch, CancellationToken cancellationToken);
    Task UpdateAsync(TutorBatch batch, CancellationToken cancellationToken);
    Task AddSessionsAsync(IEnumerable<GeneratedClassSession> sessions, CancellationToken cancellationToken);
    Task ReplaceSessionsAsync(Guid batchId, IEnumerable<GeneratedClassSession> sessions, CancellationToken cancellationToken);
    Task CancelSessionsAfterDateAsync(Guid batchId, DateTime afterDateUtc, CancellationToken cancellationToken);
    Task CompleteScheduledSessionsUpToAsync(Guid batchId, DateTime upToDateUtc, CancellationToken cancellationToken);
    Task<GeneratedClassSession?> GetSessionByIdAsync(Guid sessionId, CancellationToken cancellationToken);
    Task UpdateSessionAsync(GeneratedClassSession session, CancellationToken cancellationToken);
}
