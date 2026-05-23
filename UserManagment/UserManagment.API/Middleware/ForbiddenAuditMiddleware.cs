using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using UserManagment.API.Extensions;

namespace UserManagment.API.Middleware;

public class ForbiddenAuditMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ForbiddenAuditMiddleware> _logger;

    public ForbiddenAuditMiddleware(RequestDelegate next, ILogger<ForbiddenAuditMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        await _next(context);

        if (context.Response.StatusCode == StatusCodes.Status403Forbidden)
        {
            var userId = context.GetUserId() ?? "anonymous";
            var role = context.GetUserRole() ?? "unknown";
            var endpoint = context.GetEndpoint()?.DisplayName ?? context.Request.Path;
            _logger.LogWarning("Forbidden access blocked: {UserId} {Role} {Method} {Endpoint} at {Timestamp}",
                userId,
                role,
                context.Request.Method,
                endpoint,
                DateTime.UtcNow);
        }
    }
}
