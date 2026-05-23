using Microsoft.EntityFrameworkCore;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.Infrastructure.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly UserManagmentDbContext _context;

    public NotificationRepository(UserManagmentDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Notification notification, CancellationToken cancellationToken)
    {
        await _context.Notifications.AddAsync(notification, cancellationToken);
    }

    public async Task<IReadOnlyCollection<Notification>> GetByUserAsync(string authUserId, CancellationToken cancellationToken)
    {
        return await _context.Notifications
            .Where(n => n.RecipientAuthUserId == authUserId)
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(50)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> GetUnreadCountAsync(string authUserId, CancellationToken cancellationToken)
    {
        return await _context.Notifications
            .CountAsync(n => n.RecipientAuthUserId == authUserId && !n.IsRead, cancellationToken);
    }

    public async Task<Notification?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _context.Notifications.FindAsync(new object[] { id }, cancellationToken);
    }

    public Task UpdateAsync(Notification notification, CancellationToken cancellationToken)
    {
        _context.Notifications.Update(notification);
        return Task.CompletedTask;
    }

    public async Task MarkAllReadAsync(string authUserId, CancellationToken cancellationToken)
    {
        var unread = await _context.Notifications
            .Where(n => n.RecipientAuthUserId == authUserId && !n.IsRead)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAtUtc = now;
        }
    }
}
