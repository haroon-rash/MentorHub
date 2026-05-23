using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace UserManagment.API.Extensions;

public static class HttpContextExtensions
{
    public static string? GetAuthUserId(this HttpContext httpContext)
    {
        if (httpContext.User?.Identity?.IsAuthenticated == true)
        {
            return httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? httpContext.User.FindFirstValue("sub")
                ?? httpContext.User.FindFirstValue("id");
        }

        return null;
    }

    public static string? GetUserId(this HttpContext httpContext) => GetAuthUserId(httpContext);

    /// <summary>Signup/login email from JWT (forwarded as X-Auth-Email by the gateway).</summary>
    public static string? GetAuthEmail(this HttpContext httpContext)
    {
        if (httpContext.User?.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        return httpContext.User.FindFirstValue(ClaimTypes.Email)?.Trim();
    }

    /// <summary>
    /// Active role from authenticated claims only (JWT role set by gateway). Never reads client role headers directly.
    /// </summary>
    public static string? GetUserRole(this HttpContext httpContext)
    {
        if (httpContext.User?.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        var role = httpContext.User.FindFirstValue(ClaimTypes.Role)
            ?? httpContext.User.FindFirstValue("role");

        if (string.IsNullOrWhiteSpace(role))
        {
            return null;
        }

        var normalized = role.Trim().ToUpperInvariant();
        if (normalized.StartsWith("ROLE_"))
        {
            normalized = normalized[5..];
        }

        // Auth JWT uses numeric role codes; gateway may forward either form.
        return normalized switch
        {
            "1" => "STUDENT",
            "2" => "TUTOR",
            "3" => "OWNER",
            "4" => "ADMIN",
            _ => normalized,
        };
    }

    public static bool IsSuperAdmin(this HttpContext httpContext)
    {
        var role = httpContext.GetUserRole();
        if (string.IsNullOrWhiteSpace(role))
        {
            return false;
        }

        var normalized = role.Trim().ToUpperInvariant();
        return normalized is "SUPER_ADMIN" or "SUPERADMIN" or "ADMIN" or "OWNER";
    }

    public static bool IsAdmin(this HttpContext httpContext)
    {
        var role = httpContext.GetUserRole();
        if (string.IsNullOrWhiteSpace(role))
        {
            return false;
        }

        var normalized = role.Trim().ToUpperInvariant();
        return normalized is "ADMIN" or "SUPER_ADMIN" or "SUPERADMIN" or "OWNER";
    }

    public static bool IsStudent(this HttpContext httpContext)
    {
        var role = httpContext.GetUserRole();
        if (string.IsNullOrWhiteSpace(role))
        {
            return false;
        }

        var normalized = role.Trim().ToUpperInvariant();
        return normalized is "STUDENT";
    }

    public static bool IsTutor(this HttpContext httpContext)
    {
        var role = httpContext.GetUserRole();
        if (string.IsNullOrWhiteSpace(role))
        {
            return false;
        }

        var normalized = role.Trim().ToUpperInvariant();
        return normalized is "TUTOR";
    }

}
