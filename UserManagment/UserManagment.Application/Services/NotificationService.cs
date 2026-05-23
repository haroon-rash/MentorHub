using UserManagment.Application.Contracts;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;
namespace UserManagment.Application.Services;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _notificationRepository;
    private readonly IRealtimeNotifier _realtimeNotifier;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IExternalNotificationPublisher _externalPublisher;

    public NotificationService(
        INotificationRepository notificationRepository,
        IRealtimeNotifier realtimeNotifier,
        IUnitOfWork unitOfWork,
        IExternalNotificationPublisher externalPublisher)
    {
        _notificationRepository = notificationRepository;
        _realtimeNotifier = realtimeNotifier;
        _unitOfWork = unitOfWork;
        _externalPublisher = externalPublisher;
    }

    public async Task<NotificationResponse> CreateAsync(
        string recipientAuthUserId,
        NotificationType type,
        string title,
        string message,
        Guid? relatedEntityId,
        CancellationToken cancellationToken,
        NotificationDeliveryMetadata? metadata = null)
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            RecipientAuthUserId = recipientAuthUserId,
            Type = type,
            Title = title,
            Message = message,
            RelatedEntityId = relatedEntityId,
            IsRead = false,
            CreatedAtUtc = DateTime.UtcNow
        };

        await _notificationRepository.AddAsync(notification, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var response = MapToResponse(notification, metadata);

        await _externalPublisher.PublishAsync(
            recipientAuthUserId, type, title, message, relatedEntityId, metadata, cancellationToken);

        try
        {
            await _realtimeNotifier.NotifyUserAsync(recipientAuthUserId, "ReceiveNotification", response, cancellationToken);
        }
        catch
        {
            // Non-critical: user is offline, they'll see it next time they load
        }

        return response;
    }

    public async Task<IReadOnlyCollection<NotificationResponse>> GetForUserAsync(string authUserId, CancellationToken cancellationToken)
    {
        var notifications = await _notificationRepository.GetByUserAsync(authUserId, cancellationToken);
        return notifications.Select(n => MapToResponse(n)).ToArray();
    }

    public async Task<int> GetUnreadCountAsync(string authUserId, CancellationToken cancellationToken)
    {
        return await _notificationRepository.GetUnreadCountAsync(authUserId, cancellationToken);
    }

    public async Task MarkReadAsync(Guid notificationId, string authUserId, CancellationToken cancellationToken)
    {
        var notification = await _notificationRepository.GetByIdAsync(notificationId, cancellationToken);
        if (notification == null || notification.RecipientAuthUserId != authUserId)
            throw new InvalidOperationException("Notification not found.");

        notification.IsRead = true;
        notification.ReadAtUtc = DateTime.UtcNow;
        await _notificationRepository.UpdateAsync(notification, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkAllReadAsync(string authUserId, CancellationToken cancellationToken)
    {
        await _notificationRepository.MarkAllReadAsync(authUserId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static NotificationResponse MapToResponse(Notification n, NotificationDeliveryMetadata? metadata = null) => new()
    {
        Id = n.Id,
        Type = n.Type.ToString(),
        Title = n.Title,
        Message = n.Message,
        IsRead = n.IsRead,
        RelatedEntityId = n.RelatedEntityId,
        CreatedAtUtc = n.CreatedAtUtc,
        ReadAtUtc = n.ReadAtUtc,
        ActionPath = metadata?.ActionPath,
    };
}
