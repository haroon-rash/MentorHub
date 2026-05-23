using UserManagment.Domain.Entities;

namespace UserManagment.Application.Interfaces;

public interface IUserAccountRepository
{
    Task<UserAccount?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<UserAccount?> GetByAuthUserIdAsync(string authUserId, CancellationToken cancellationToken);
    Task<UserAccount?> GetByEmailAsync(string email, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<UserAccount>> GetAllPagedAsync(int skip, int take, string? search, CancellationToken cancellationToken);
    Task<int> CountAllAsync(string? search, CancellationToken cancellationToken);
    Task AddAsync(UserAccount userAccount, CancellationToken cancellationToken);
    Task UpdateAsync(UserAccount userAccount, CancellationToken cancellationToken);
    Task DeleteAsync(UserAccount userAccount, CancellationToken cancellationToken);
}
