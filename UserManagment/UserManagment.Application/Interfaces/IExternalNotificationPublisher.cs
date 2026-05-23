using UserManagment.Application.Contracts;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Interfaces;

public interface IExternalNotificationPublisher
{
    Task PublishAsync(
        string recipientAuthUserId,
        NotificationType type,
        string title,
        string message,
        Guid? relatedEntityId,
        NotificationDeliveryMetadata? metadata,
        CancellationToken cancellationToken);
}
