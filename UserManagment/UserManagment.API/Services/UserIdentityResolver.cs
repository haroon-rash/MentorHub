using Microsoft.EntityFrameworkCore;
using UserManagment.Domain.Enums;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.API.Services;

/// <summary>
/// Resolves platform identity to auth user id (signup_user.user_id / JWT sub).
/// Prefer email when available; auth user id is the canonical chat/moderation identifier.
/// </summary>
public static class UserIdentityResolver
{
    private sealed class SignupIdRow
    {
        public string Id { get; set; } = string.Empty;
    }

    public static async Task<string?> ResolveAuthUserIdAsync(
        UserManagmentDbContext context,
        string? authUserId,
        string? email,
        CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(authUserId))
        {
            var trimmed = authUserId.Trim();

            var byAuth = await context.UserAccounts.AsNoTracking()
                .Where(u => u.AuthUserId == trimmed)
                .Select(u => u.AuthUserId)
                .FirstOrDefaultAsync(cancellationToken);
            if (!string.IsNullOrEmpty(byAuth))
            {
                return byAuth;
            }

            if (Guid.TryParse(trimmed, out var accountId))
            {
                var byAccountId = await context.UserAccounts.AsNoTracking()
                    .Where(u => u.Id == accountId)
                    .Select(u => u.AuthUserId)
                    .FirstOrDefaultAsync(cancellationToken);
                if (!string.IsNullOrEmpty(byAccountId))
                {
                    return byAccountId;
                }
            }

            var signupById = await context.Database
                .SqlQuery<SignupIdRow>($"""
                    SELECT user_id::text AS "Id"
                    FROM signup_user
                    WHERE user_id::text = {trimmed}
                    LIMIT 1
                    """)
                .FirstOrDefaultAsync(cancellationToken);
            if (signupById != null)
            {
                return signupById.Id;
            }
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            return null;
        }

        var emailLower = email.Trim().ToLowerInvariant();

        var byEmail = await context.UserAccounts.AsNoTracking()
            .Where(u => u.Email.ToLower() == emailLower)
            .Select(u => u.AuthUserId)
            .FirstOrDefaultAsync(cancellationToken);
        if (!string.IsNullOrEmpty(byEmail))
        {
            return byEmail;
        }

        var signupByEmail = await context.Database
            .SqlQuery<SignupIdRow>($"""
                SELECT user_id::text AS "Id"
                FROM signup_user
                WHERE lower(user_email) = {emailLower}
                LIMIT 1
                """)
            .FirstOrDefaultAsync(cancellationToken);
        return signupByEmail?.Id;
    }

    public static async Task<HashSet<string>> GetAdminAuthUserIdsAsync(
        UserManagmentDbContext context,
        CancellationToken cancellationToken = default)
    {
        var ids = await context.UserAccounts.AsNoTracking()
            .Where(u => u.Role == PlatformUserRole.SuperAdmin)
            .Select(u => u.AuthUserId)
            .ToListAsync(cancellationToken);

        var signupAdmins = await context.Database
            .SqlQuery<SignupIdRow>($"""
                SELECT user_id::text AS "Id"
                FROM signup_user
                WHERE upper(role) IN ('ADMIN', 'OWNER', 'SUPER_ADMIN')
                """)
            .ToListAsync(cancellationToken);

        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var id in ids.Where(id => !string.IsNullOrWhiteSpace(id)))
        {
            set.Add(id);
        }

        foreach (var row in signupAdmins)
        {
            if (!string.IsNullOrWhiteSpace(row.Id))
            {
                set.Add(row.Id);
            }
        }

        return set;
    }
}
