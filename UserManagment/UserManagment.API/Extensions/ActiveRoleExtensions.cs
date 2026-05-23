using Microsoft.AspNetCore.Mvc;

namespace UserManagment.API.Extensions;

/// <summary>
/// Enforces JWT signup role on role-specific API routes.
/// </summary>
public static class ActiveRoleExtensions
{
    public static IActionResult? ForbidUnlessActiveStudent(this HttpContext httpContext)
    {
        if (httpContext.IsSuperAdmin() || httpContext.IsAdmin())
        {
            return null;
        }

        return httpContext.IsStudent() ? null : new ForbidResult();
    }

    public static IActionResult? ForbidUnlessActiveTutor(this HttpContext httpContext)
    {
        if (httpContext.IsSuperAdmin() || httpContext.IsAdmin())
        {
            return null;
        }

        return httpContext.IsTutor() ? null : new ForbidResult();
    }

    public static IActionResult? ForbidUnlessActiveStudentOrTutor(this HttpContext httpContext)
    {
        if (httpContext.IsSuperAdmin() || httpContext.IsAdmin())
        {
            return null;
        }

        return httpContext.IsStudent() || httpContext.IsTutor() ? null : new ForbidResult();
    }
}
