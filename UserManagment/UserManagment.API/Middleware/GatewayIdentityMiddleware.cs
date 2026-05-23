using System.Security.Claims;
using UserManagment.API.Authentication;

namespace UserManagment.API.Middleware;

/// <summary>
/// Populates <see cref="HttpContext.User"/> from gateway-forwarded headers so admin and chat
/// endpoints work without requiring JWT validation inside this service.
/// </summary>
public class GatewayIdentityMiddleware
{
    private readonly RequestDelegate _next;

    public GatewayIdentityMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User?.Identity?.IsAuthenticated != true)
        {
            var authUserId = context.Request.Headers["X-Auth-User-Id"].FirstOrDefault();
            var authEmail = context.Request.Headers["X-Auth-Email"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(authUserId))
            {
                var claims = new List<Claim>
                {
                    new(ClaimTypes.NameIdentifier, authUserId),
                    new(ClaimTypes.Name, authUserId),
                };

                if (!string.IsNullOrWhiteSpace(authEmail))
                {
                    claims.Add(new Claim(ClaimTypes.Email, authEmail.Trim()));
                }

                var role = context.Request.Headers["X-User-Role"].FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(role))
                {
                    var normalized = role.Trim().ToUpperInvariant();
                    if (normalized.StartsWith("ROLE_"))
                    {
                        normalized = normalized[5..];
                    }

                    claims.Add(new Claim(ClaimTypes.Role, normalized));
                }

                context.User = new ClaimsPrincipal(
                    new ClaimsIdentity(claims, HeaderAuthenticationOptions.SchemeName));
            }
        }

        await _next(context);
    }
}
