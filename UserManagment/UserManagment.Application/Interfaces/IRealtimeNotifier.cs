namespace UserManagment.Application.Interfaces;

/// <summary>
/// Abstraction for real-time push delivery (SignalR, WebPush, etc.)
/// Keeps Application layer free from infrastructure concerns.
/// </summary>
public interface IRealtimeNotifier
{
    Task NotifyUserAsync(string recipientAuthUserId, string eventName, object payload, CancellationToken cancellationToken = default);
}
