using UserManagment.Domain.Entities;

namespace UserManagment.Application.Interfaces;

public interface IStudyMaterialRepository
{
    Task<StudyMaterial?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<StudyMaterial>> GetByTutorAsync(Guid tutorProfileId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<StudyMaterial>> GetForStudentAsync(Guid studentProfileId, CancellationToken cancellationToken);
    Task AddAsync(StudyMaterial material, CancellationToken cancellationToken);
    Task UpdateAsync(StudyMaterial material, CancellationToken cancellationToken);
}
