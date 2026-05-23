namespace UserManagment.API.Middleware;

/// <summary>
/// In production, rejects requests that did not pass through the API gateway with a validated JWT.
/// Prevents clients from spoofing X-Auth-User-Id / X-User-Role directly against UserManagment.API.
/// </summary>
public class GatewayTrustMiddleware
{
    public const string GatewayVerifiedHeader = "X-MentorHub-Gateway-Auth";
    public const string GatewayVerifiedValue = "verified";

    private readonly RequestDelegate _next;
    private readonly bool _requireGatewayTrust;

    public GatewayTrustMiddleware(RequestDelegate next, IConfiguration configuration, IHostEnvironment environment)
    {
        _next = next;
        _requireGatewayTrust = configuration.GetValue<bool>("Security:RequireGatewayTrust")
            || environment.IsProduction();
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (_requireGatewayTrust && !IsExemptFromGatewayMarker(context))
        {
            var marker = context.Request.Headers[GatewayVerifiedHeader].FirstOrDefault();
            if (!string.Equals(marker, GatewayVerifiedValue, StringComparison.Ordinal))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { message = "Request must be authenticated via the API gateway." });
                return;
            }
        }

        await _next(context);
    }

    /// <summary>
    /// Paths that are intentionally public (no Bearer) or internal (server-to-server with API key).
    /// The gateway only sets X-MentorHub-Gateway-Auth when a JWT is present, so anonymous browser
    /// reads must bypass the marker check — they never consume trusted identity headers.
    /// </summary>
    private static bool IsExemptFromGatewayMarker(HttpContext context)
    {
        var value = context.Request.Path.Value ?? string.Empty;
        if (value.StartsWith("/health", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("/api/internal/", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // Anonymous-safe GETs used by the SPA without Authorization (browser → gateway → this API).
        if (!HttpMethods.IsGet(context.Request.Method))
        {
            return false;
        }

        if (value.StartsWith("/api/v1/tutors", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("/api/v1/reviews/tutor/", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("/api/v1/tutor-batches/tutor/", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("/api/v1/cms", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("/api/v1/catalog", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return false;
    }
}
