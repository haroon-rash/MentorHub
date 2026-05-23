using Microsoft.AspNetCore.SignalR;
using UserManagment.API.Hubs;
using UserManagment.Application.Interfaces;

namespace UserManagment.API.Services;

/// <summary>
/// Implements real-time push via SignalR, living in the API layer where SignalR is available.
/// </summary>
public class SignalRRealtimeNotifier : IRealtimeNotifier
{
    private readonly IHubContext<ChatHub> _hubContext;

    public SignalRRealtimeNotifier(IHubContext<ChatHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task NotifyUserAsync(string recipientAuthUserId, string eventName, object payload, CancellationToken cancellationToken = default)
    {
        await _hubContext.Clients.User(recipientAuthUserId)
            .SendAsync(eventName, payload, cancellationToken);
    }
}
