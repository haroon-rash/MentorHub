using Microsoft.EntityFrameworkCore;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.Infrastructure.Repositories;

public class StudentProfileRepository : IStudentProfileRepository
{
    private readonly UserManagmentDbContext _dbContext;

    public StudentProfileRepository(UserManagmentDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<StudentProfile?> GetByAuthUserIdAsync(string authUserId, CancellationToken cancellationToken)
    {
        var identifier = authUserId.ToLower();
        return _dbContext.StudentProfiles
            .Include(profile => profile.UserAccount)
            .FirstOrDefaultAsync(profile => 
                profile.UserAccount.AuthUserId.ToLower() == identifier || 
                profile.UserAccount.Email.ToLower() == identifier, 
                cancellationToken);
    }

    public async Task AddAsync(StudentProfile studentProfile, CancellationToken cancellationToken)
    {
        await _dbContext.StudentProfiles.AddAsync(studentProfile, cancellationToken);
    }

    public Task UpdateAsync(StudentProfile studentProfile, CancellationToken cancellationToken)
    {
        _dbContext.StudentProfiles.Update(studentProfile);
        return Task.CompletedTask;
    }
}
