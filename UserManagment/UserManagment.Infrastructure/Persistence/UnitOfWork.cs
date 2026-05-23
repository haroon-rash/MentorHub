using UserManagment.Application.Interfaces;

namespace UserManagment.Infrastructure.Persistence;

public class UnitOfWork : IUnitOfWork
{
    private readonly UserManagmentDbContext _dbContext;

    public UnitOfWork(UserManagmentDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
