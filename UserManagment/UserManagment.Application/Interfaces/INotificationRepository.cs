using UserManagment.Domain.Entities;

namespace UserManagment.Application.Interfaces;

public interface INotificationRepository
{
    Task AddAsync(Notification notification, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Notification>> GetByUserAsync(string authUserId, CancellationToken cancellationToken);
    Task<int> GetUnreadCountAsync(string authUserId, CancellationToken cancellationToken);
    Task<Notification?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task UpdateAsync(Notification notification, CancellationToken cancellationToken);
    Task MarkAllReadAsync(string authUserId, CancellationToken cancellationToken);
}
