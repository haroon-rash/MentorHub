using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;

namespace UserManagment.Application.Interfaces;

public interface IReviewService
{
    Task<ReviewResponse> CreateReviewAsync(string studentAuthUserId, CreateReviewRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<ReviewResponse>> GetTutorReviewsAsync(Guid tutorProfileId, CancellationToken cancellationToken);
}
