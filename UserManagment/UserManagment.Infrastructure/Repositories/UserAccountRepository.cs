using Microsoft.EntityFrameworkCore;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.Infrastructure.Repositories;

public class UserAccountRepository : IUserAccountRepository
{
    private readonly UserManagmentDbContext _dbContext;

    public UserAccountRepository(UserManagmentDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<UserAccount?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _dbContext.UserAccounts
            .Include(account => account.TutorProfile)
            .Include(account => account.StudentProfile)
            .FirstOrDefaultAsync(account => account.Id == id, cancellationToken);
    }

    public async Task<UserAccount?> GetByAuthUserIdAsync(string authUserId, CancellationToken cancellationToken)
    {
        var authUserIdLower = authUserId.ToLower();
        return await _dbContext.UserAccounts
            .Include(account => account.TutorProfile)
            .Include(account => account.StudentProfile)
            .FirstOrDefaultAsync(account => account.AuthUserId.ToLower() == authUserIdLower, cancellationToken);
    }

    public Task<UserAccount?> GetByEmailAsync(string email, CancellationToken cancellationToken)
    {
        var emailLower = email.ToLower();
        return _dbContext.UserAccounts.FirstOrDefaultAsync(account => account.Email.ToLower() == emailLower, cancellationToken);
    }

    public async Task AddAsync(UserAccount userAccount, CancellationToken cancellationToken)
    {
        await _dbContext.UserAccounts.AddAsync(userAccount, cancellationToken);
    }

    public async Task<IReadOnlyCollection<UserAccount>> GetAllPagedAsync(int skip, int take, string? search, CancellationToken cancellationToken)
    {
        var query = _dbContext.UserAccounts.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(u => u.FullName.ToLower().Contains(searchLower) || u.Email.ToLower().Contains(searchLower));
        }

        return await query
            .OrderByDescending(u => u.CreatedAtUtc)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> CountAllAsync(string? search, CancellationToken cancellationToken)
    {
        var query = _dbContext.UserAccounts.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(u => u.FullName.ToLower().Contains(searchLower) || u.Email.ToLower().Contains(searchLower));
        }
        return await query.CountAsync(cancellationToken);
    }

    public Task UpdateAsync(UserAccount userAccount, CancellationToken cancellationToken)
    {
        _dbContext.UserAccounts.Update(userAccount);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(UserAccount userAccount, CancellationToken cancellationToken)
    {
        _dbContext.UserAccounts.Remove(userAccount);
        return Task.CompletedTask;
    }
}
