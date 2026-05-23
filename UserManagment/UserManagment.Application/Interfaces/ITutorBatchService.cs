using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;

namespace UserManagment.Application.Interfaces;

public interface ITutorBatchService
{
    Task<TutorBatchResponse> CreateBatchAsync(string authUserId, CreateTutorBatchRequest request, CancellationToken cancellationToken);
    Task<TutorBatchResponse> UpdateBatchAsync(string authUserId, Guid batchId, UpdateTutorBatchRequest request, CancellationToken cancellationToken);
    Task DeleteBatchAsync(string authUserId, Guid batchId, DeleteTutorBatchRequest request, CancellationToken cancellationToken);
    Task<TutorBatchResponse> ArchiveBatchAsync(string authUserId, Guid batchId, CancellationToken cancellationToken);
    Task<TutorBatchResponse> DuplicateBatchAsync(string authUserId, Guid batchId, CancellationToken cancellationToken);
    Task<TutorBatchResponse> CompleteBatchAsync(string authUserId, Guid batchId, CancellationToken cancellationToken);
    Task<TutorBatchResponse> CancelBatchAsync(string authUserId, Guid batchId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<TutorBatchResponse>> GetTutorBatchesAsync(string authUserId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<TutorBatchResponse>> GetPublishedBatchesForTutorAsync(Guid tutorProfileId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<GeneratedClassSessionResponse>> GetBatchSessionsAsync(string authUserId, Guid batchId, CancellationToken cancellationToken);
    Task<TutorBatchDetailResponse> GetBatchDetailForTutorAsync(string authUserId, Guid batchId, CancellationToken cancellationToken);
}
