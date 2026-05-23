using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;
using UserManagment.API.Extensions;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Enums;

namespace UserManagment.API.Middleware;

public class TutorStatusMiddleware
{
    private readonly RequestDelegate _next;

    public TutorStatusMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext ctx, ITutorProfileRepository repo)
    {
        var endpoint = ctx.GetEndpoint();
        if (endpoint?.Metadata.GetMetadata<RequireApprovedTutorAttribute>() != null && ctx.IsTutor())
        {
            var authUserId = ctx.GetAuthUserId();
            if (!string.IsNullOrWhiteSpace(authUserId))
            {
                var profile = await repo.GetByAuthUserIdAsync(authUserId, ctx.RequestAborted);
                if (profile == null)
                {
                    ctx.Response.StatusCode = 403;
                    await ctx.Response.WriteAsJsonAsync(new
                    {
                        error = "tutor_profile_missing",
                        message = "Tutor profile not found. Approval is required to access this resource."
                    });
                    return;
                }

                if (profile.VerificationStatus != TutorVerificationStatus.Approved)
                {
                    ctx.Response.StatusCode = 403;
                    await ctx.Response.WriteAsJsonAsync(new
                    {
                        error = "tutor_not_approved",
                        message = "Your tutor profile is not approved. Access to this endpoint is restricted until approval is completed."
                    });
                    return;
                }
            }
        }

        await _next(ctx);
    }
}
