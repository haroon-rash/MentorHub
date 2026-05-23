using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;

namespace UserManagment.Application.Interfaces;

public interface IStudyMaterialService
{
    Task<StudyMaterialResponse> CreateAsync(string authUserId, CreateStudyMaterialRequest request, CancellationToken cancellationToken);
    Task<StudyMaterialResponse> UpdateAsync(string authUserId, Guid materialId, UpdateStudyMaterialRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(string authUserId, Guid materialId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<StudyMaterialResponse>> GetForTutorAsync(string authUserId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<StudyMaterialResponse>> GetForStudentAsync(string authUserId, CancellationToken cancellationToken);
}
