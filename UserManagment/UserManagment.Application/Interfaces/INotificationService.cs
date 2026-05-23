using UserManagment.Application.Contracts;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Interfaces;

public interface INotificationService
{
    Task<NotificationResponse> CreateAsync(
        string recipientAuthUserId,
        NotificationType type,
        string title,
        string message,
        Guid? relatedEntityId,
        CancellationToken cancellationToken,
        NotificationDeliveryMetadata? metadata = null);

    Task<IReadOnlyCollection<NotificationResponse>> GetForUserAsync(string authUserId, CancellationToken cancellationToken);
    Task<int> GetUnreadCountAsync(string authUserId, CancellationToken cancellationToken);
    Task MarkReadAsync(Guid notificationId, string authUserId, CancellationToken cancellationToken);
    Task MarkAllReadAsync(string authUserId, CancellationToken cancellationToken);
}
