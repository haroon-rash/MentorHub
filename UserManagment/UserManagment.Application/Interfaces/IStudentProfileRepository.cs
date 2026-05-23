using UserManagment.Domain.Entities;

namespace UserManagment.Application.Interfaces;

public interface IStudentProfileRepository
{
    Task<StudentProfile?> GetByAuthUserIdAsync(string authUserId, CancellationToken cancellationToken);
    Task AddAsync(StudentProfile studentProfile, CancellationToken cancellationToken);
    Task UpdateAsync(StudentProfile studentProfile, CancellationToken cancellationToken);
}
