using Microsoft.EntityFrameworkCore;
using UserManagment.API.Extensions;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.API.Middleware;

public class AccountRestrictionMiddleware
{
    private readonly RequestDelegate _next;

    public AccountRestrictionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, UserManagmentDbContext db)
    {
        if (context.IsAdmin())
        {
            await _next(context);
            return;
        }

        var authUserId = context.GetAuthUserId();
        if (!string.IsNullOrWhiteSpace(authUserId))
        {
            var now = DateTime.UtcNow;
            var restrictions = await db.AccountRestrictions.AsNoTracking()
                .Where(r => r.IsActive
                    && r.TargetAuthUserId == authUserId
                    && (r.ExpiresAtUtc == null || r.ExpiresAtUtc > now))
                .Select(r => r.RestrictionType)
                .ToListAsync(context.RequestAborted);

            if (restrictions.Any(r => r is "LOGIN" or "FULL_FREEZE"))
            {
                context.Response.StatusCode = 403;
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "account_restricted",
                    message = "Your account is restricted. Contact support for assistance."
                });
                return;
            }

            var path = context.Request.Path.Value?.ToLowerInvariant() ?? string.Empty;
            if (restrictions.Any(r => r == "CHAT") && path.Contains("/api/v1/chat"))
            {
                context.Response.StatusCode = 403;
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "chat_restricted",
                    message = "Messaging is restricted on your account."
                });
                return;
            }
        }

        await _next(context);
    }
}
