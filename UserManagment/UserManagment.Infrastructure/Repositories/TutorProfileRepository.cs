using Microsoft.EntityFrameworkCore;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.Infrastructure.Repositories;

public class TutorProfileRepository : ITutorProfileRepository
{
    private readonly UserManagmentDbContext _dbContext;

    public TutorProfileRepository(UserManagmentDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<TutorProfile?> GetByAuthUserIdAsync(string authUserId, CancellationToken cancellationToken)
    {
        var identifier = authUserId.ToLower();
        return _dbContext.TutorProfiles
            .Include(profile => profile.UserAccount)
            .FirstOrDefaultAsync(profile => 
                profile.UserAccount.AuthUserId.ToLower() == identifier || 
                profile.UserAccount.Email.ToLower() == identifier, 
                cancellationToken);
    }

    public Task<TutorProfile?> GetByIdAsync(Guid tutorProfileId, CancellationToken cancellationToken)
    {
        return _dbContext.TutorProfiles
            .Include(profile => profile.UserAccount)
            .FirstOrDefaultAsync(profile => profile.Id == tutorProfileId, cancellationToken);
    }

    public Task<TutorProfile?> GetByUserAccountIdAsync(Guid userAccountId, CancellationToken cancellationToken)
    {
        return _dbContext.TutorProfiles
            .Include(profile => profile.UserAccount)
            .FirstOrDefaultAsync(profile => profile.UserAccount.Id == userAccountId, cancellationToken);
    }

    public async Task AddAsync(TutorProfile tutorProfile, CancellationToken cancellationToken)
    {
        await _dbContext.TutorProfiles.AddAsync(tutorProfile, cancellationToken);
    }

    public Task UpdateAsync(TutorProfile tutorProfile, CancellationToken cancellationToken)
    {
        _dbContext.TutorProfiles.Update(tutorProfile);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyCollection<TutorProfile>> GetTutorRequestsAsync(TutorVerificationStatus? status, CancellationToken cancellationToken)
    {
        var query = _dbContext.TutorProfiles.Include(profile => profile.UserAccount).AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(profile => profile.VerificationStatus == status.Value);
        }

        return await query
            .OrderByDescending(profile => profile.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);
    }

    public async Task<int> CountAsync(TutorVerificationStatus? status, CancellationToken cancellationToken)
    {
        if (!status.HasValue)
        {
            return await _dbContext.TutorProfiles.CountAsync(cancellationToken);
        }

        return await _dbContext.TutorProfiles.CountAsync(profile => profile.VerificationStatus == status.Value, cancellationToken);
    }
}
