using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using UserManagment.Domain.Entities;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly UserManagmentDbContext _context;

    public ChatHub(UserManagmentDbContext context)
    {
        _context = context;
    }

    public async Task SendMessage(string receiverAuthUserId, string content)
    {
        // Security: only use JWT-derived identity, never client-supplied headers
        var senderAuthUserId = Context.UserIdentifier;

        if (string.IsNullOrEmpty(senderAuthUserId))
        {
            throw new HubException("User identity not found. Ensure you are authenticated with a valid JWT.");
        }

        if (string.IsNullOrWhiteSpace(content) || content.Length > 2000)
        {
            throw new HubException("Message content is invalid.");
        }

        var message = new ChatMessage
        {
            Id = Guid.NewGuid(),
            SenderAuthUserId = senderAuthUserId,
            ReceiverAuthUserId = receiverAuthUserId,
            Content = content.Trim(),
            SentAtUtc = DateTime.UtcNow,
            IsRead = false
        };

        _context.ChatMessages.Add(message);
        await _context.SaveChangesAsync();

        // Send to receiver if online
        await Clients.User(receiverAuthUserId).SendAsync("ReceiveMessage", senderAuthUserId, content, message.SentAtUtc, message.Id);

        // Confirm delivery to sender
        await Clients.Caller.SendAsync("MessageSent", message.Id, message.SentAtUtc);
    }

    public override async Task OnConnectedAsync()
    {
        var authUserId = Context.UserIdentifier;
        if (!string.IsNullOrEmpty(authUserId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, authUserId);
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var authUserId = Context.UserIdentifier;
        if (!string.IsNullOrEmpty(authUserId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, authUserId);
        }
        await base.OnDisconnectedAsync(exception);
    }
}
