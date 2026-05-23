using Microsoft.AspNetCore.SignalR;

namespace UserManagment.API.Hubs;

public class CustomUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
    {
        return connection.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
               ?? connection.User?.FindFirst("id")?.Value
               ?? connection.User?.FindFirst("sub")?.Value;
    }
}
