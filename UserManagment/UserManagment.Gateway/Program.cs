using System.Security.Claims;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using UserManagment.Gateway.Services;

var builder = WebApplication.CreateBuilder(args);

var ocelotFile = builder.Environment.IsEnvironment("Docker")
	? "ocelot.Docker.json"
	: "ocelot.json";

builder.Configuration
	.SetBasePath(builder.Environment.ContentRootPath)
	.AddJsonFile(ocelotFile, optional: false, reloadOnChange: true)
	.AddEnvironmentVariables();

builder.Services.AddCors(options =>
{
	options.AddPolicy("frontend", policy =>
	{
		policy.WithOrigins(
				"http://localhost:3000",
				"http://localhost:5173",
				"http://localhost:3005",
				"http://127.0.0.1:3000",
				"http://127.0.0.1:5173",
				"http://127.0.0.1:3005")
			.AllowAnyHeader()
			.AllowAnyMethod()
			.AllowCredentials();
	});
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<GatewayJwtValidator>();
builder.Services.AddOcelot(builder.Configuration)
	.AddDelegatingHandler<GatewayDownstreamIdentityHandler>(global: true);

var app = builder.Build();

app.UseCors("frontend");
app.UseWebSockets();

app.MapGet("/", () => "MentorHub API Gateway is running");
app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "UserManagment.Gateway" }));

var jwtValidator = app.Services.GetRequiredService<GatewayJwtValidator>();

static string? MapJwtRoleToPlatformHeader(string? raw)
{
    if (string.IsNullOrWhiteSpace(raw))
    {
        return null;
    }

    var normalized = raw.Trim().ToUpperInvariant();
    if (normalized.StartsWith("ROLE_", StringComparison.Ordinal))
    {
        normalized = normalized[5..];
    }

    return normalized switch
    {
        "1" => "STUDENT",
        "2" => "TUTOR",
        "3" => "OWNER",
        "4" => "ADMIN",
        _ => normalized,
    };
}

app.Use(async (context, next) =>
{
    if (context.Request.Path == "/health" && context.Request.Method == "GET")
    {
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new { status = "ok", service = "UserManagment.Gateway" });
        return;
    }

    // Strip client-supplied identity headers; only gateway may set them after JWT validation.
    context.Request.Headers.Remove("X-Auth-User-Id");
    context.Request.Headers.Remove("X-User-Role");
    context.Request.Headers.Remove(GatewayTrustHeaderNames.Verified);

    var authHeader = context.Request.Headers.Authorization.ToString();
    var hasBearer = !string.IsNullOrEmpty(authHeader)
        && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase);

    if (hasBearer)
    {
        var token = authHeader["Bearer ".Length..];
        if (jwtValidator.TryValidate(token, out var principal, out var failureReason))
        {
            // JwtSecurityTokenHandler maps JWT short name "role" to ClaimTypes.Role by default.
            var userId = principal?.FindFirst("id")?.Value;
            var jwtSubject = principal?.FindFirst("sub")?.Value;
            var authEmail = jwtSubject?.Contains('@') == true ? jwtSubject : null;
            var rawRole = principal?.FindFirst(ClaimTypes.Role)?.Value
                          ?? principal?.FindFirst("role")?.Value;
            var role = MapJwtRoleToPlatformHeader(rawRole);

            if (!string.IsNullOrEmpty(userId))
            {
                context.Request.Headers["X-Auth-User-Id"] = userId;
            }
            else if (!string.IsNullOrEmpty(jwtSubject) && !jwtSubject.Contains('@'))
            {
                context.Request.Headers["X-Auth-User-Id"] = jwtSubject;
            }

            if (!string.IsNullOrEmpty(authEmail))
            {
                context.Request.Headers["X-Auth-Email"] = authEmail;
            }
            if (!string.IsNullOrEmpty(role))
            {
                context.Request.Headers["X-User-Role"] = role;
            }

            context.Request.Headers["X-MentorHub-Gateway-Auth"] = "verified";
        }
        else
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { message = failureReason ?? "Invalid or expired token." });
            return;
        }
    }

    await next();
});

await app.UseOcelot();
app.Run();
