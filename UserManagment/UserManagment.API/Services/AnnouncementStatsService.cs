using Microsoft.EntityFrameworkCore;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.API.Services;

public static class AnnouncementStatsService
{
    private sealed class CountRow
    {
        public int Count { get; set; }
    }

    private sealed class AnnouncementRow
    {
        public Guid Id { get; set; }
        public Guid TutorProfileId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? TargetType { get; set; }
        public DateTime CreatedAtUtc { get; set; }
    }

    public static async Task<int> CountForTutorAsync(
        UserManagmentDbContext context,
        Guid tutorProfileId,
        CancellationToken cancellationToken = default)
    {
        var snake = await TryCountAsync(
            context,
            """
            SELECT COUNT(*)::int AS "Count"
            FROM session_announcements
            WHERE tutor_profile_id = {0}
            """,
            tutorProfileId,
            cancellationToken);
        if (snake > 0)
        {
            return snake;
        }

        return await TryCountAsync(
            context,
            """
            SELECT COUNT(*)::int AS "Count"
            FROM session_announcements
            WHERE "TutorProfileId" = {0}
            """,
            tutorProfileId,
            cancellationToken);
    }

    public static async Task<int> CountUnreadForStudentTutorAsync(
        UserManagmentDbContext context,
        Guid studentProfileId,
        Guid tutorProfileId,
        CancellationToken cancellationToken = default)
    {
        var snake = await TryCountAsync(
            context,
            """
            SELECT COUNT(*)::int AS "Count"
            FROM session_announcements a
            WHERE a.tutor_profile_id = {0}
              AND NOT EXISTS (
                SELECT 1 FROM announcement_read_receipts r
                WHERE r.announcement_id = a.id
                  AND r.student_profile_id = {1}
              )
            """,
            tutorProfileId,
            studentProfileId,
            cancellationToken);

        if (snake > 0)
        {
            return snake;
        }

        return await TryCountAsync(
            context,
            """
            SELECT COUNT(*)::int AS "Count"
            FROM session_announcements a
            WHERE a."TutorProfileId" = {0}
              AND NOT EXISTS (
                SELECT 1 FROM announcement_read_receipts r
                WHERE r."AnnouncementId" = a."Id"
                  AND r."StudentProfileId" = {1}
              )
            """,
            tutorProfileId,
            studentProfileId,
            cancellationToken);
    }

    public static async Task<int> CountUnreadForStudentAsync(
        UserManagmentDbContext context,
        Guid studentProfileId,
        IEnumerable<Guid> tutorProfileIds,
        CancellationToken cancellationToken = default)
    {
        var ids = tutorProfileIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return 0;
        }

        var total = 0;
        foreach (var tutorId in ids)
        {
            total += await CountUnreadForStudentTutorAsync(context, studentProfileId, tutorId, cancellationToken);
        }

        return total;
    }

    public static async Task<IReadOnlyDictionary<Guid, string>> ResolveTutorDisplayNamesAsync(
        UserManagmentDbContext context,
        IEnumerable<Guid> tutorProfileIds,
        CancellationToken cancellationToken = default)
    {
        var ids = tutorProfileIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<Guid, string>();
        }

        var rows = await context.TutorProfiles.AsNoTracking()
            .Where(t => ids.Contains(t.Id))
            .Select(t => new
            {
                t.Id,
                FullName = t.UserAccount != null ? t.UserAccount.FullName : null,
                Email = t.UserAccount != null ? t.UserAccount.Email : null,
            })
            .ToListAsync(cancellationToken);

        return rows.ToDictionary(
            r => r.Id,
            r => FormatDisplayName(r.FullName, r.Email));
    }

    private static string FormatDisplayName(string? fullName, string? email)
    {
        if (!string.IsNullOrWhiteSpace(fullName))
        {
            return fullName.Trim();
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            var at = email.IndexOf('@');
            return at > 0 ? email[..at] : email;
        }

        return "Tutor";
    }

    public static async Task<IReadOnlyList<object>> ListForTutorAsync(
        UserManagmentDbContext context,
        Guid tutorProfileId,
        Guid? studentProfileId,
        string? tutorName,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tutorName))
        {
            var names = await ResolveTutorDisplayNamesAsync(context, new[] { tutorProfileId }, cancellationToken);
            tutorName = names.GetValueOrDefault(tutorProfileId, "Tutor");
        }
        else
        {
            tutorName = tutorName.Trim();
        }
        var rows = await TryListAsync(
            context,
            """
            SELECT id AS "Id",
                   tutor_profile_id AS "TutorProfileId",
                   COALESCE(title, '') AS "Title",
                   COALESCE(content, '') AS "Content",
                   target_type AS "TargetType",
                   created_at AS "CreatedAtUtc"
            FROM session_announcements
            WHERE tutor_profile_id = {0}
            ORDER BY created_at DESC
            LIMIT 200
            """,
            tutorProfileId,
            cancellationToken);

        if (rows.Count == 0)
        {
            rows = await TryListAsync(
                context,
                """
                SELECT "Id" AS "Id",
                       "TutorProfileId" AS "TutorProfileId",
                       COALESCE("Title", '') AS "Title",
                       COALESCE("AnnouncementText", '') AS "Content",
                       CAST("TargetType" AS text) AS "TargetType",
                       "CreatedAtUtc" AS "CreatedAtUtc"
                FROM session_announcements
                WHERE "TutorProfileId" = {0}
                ORDER BY "CreatedAtUtc" DESC
                LIMIT 200
                """,
                tutorProfileId,
                cancellationToken);
        }

        var readIds = studentProfileId.HasValue
            ? await GetReadAnnouncementIdsAsync(context, studentProfileId.Value, cancellationToken)
            : new HashSet<Guid>();

        return rows.Select(a => new
        {
            id = a.Id,
            tutorProfileId = a.TutorProfileId,
            title = a.Title,
            content = a.Content,
            announcementText = a.Content,
            targetType = a.TargetType,
            createdAt = a.CreatedAtUtc,
            createdAtUtc = a.CreatedAtUtc,
            tutorName,
            isRead = readIds.Contains(a.Id),
        }).Cast<object>().ToList();
    }

    public static async Task<IReadOnlyList<object>> ListForStudentAsync(
        UserManagmentDbContext context,
        Guid studentProfileId,
        IReadOnlyCollection<Guid> tutorProfileIds,
        IReadOnlyDictionary<Guid, string> tutorNames,
        CancellationToken cancellationToken = default)
    {
        var resolvedNames = await ResolveTutorDisplayNamesAsync(context, tutorProfileIds, cancellationToken);
        var all = new List<object>();
        foreach (var tutorId in tutorProfileIds.Distinct())
        {
            if (!tutorNames.TryGetValue(tutorId, out var name) || string.IsNullOrWhiteSpace(name) || name == "Tutor")
            {
                name = resolvedNames.GetValueOrDefault(tutorId, "Tutor");
            }

            var items = await ListForTutorAsync(context, tutorId, studentProfileId, name, cancellationToken);
            all.AddRange(items);
        }

        return all
            .OrderByDescending(a => ((dynamic)a).createdAtUtc)
            .ToList();
    }

    public static async Task MarkReadAsync(
        UserManagmentDbContext context,
        Guid announcementId,
        Guid studentProfileId,
        CancellationToken cancellationToken = default)
    {
        var existsSnake = await context.Database
            .SqlQuery<CountRow>($"""
                SELECT COUNT(*)::int AS "Count"
                FROM announcement_read_receipts
                WHERE announcement_id = {announcementId} AND student_profile_id = {studentProfileId}
                """)
            .FirstOrDefaultAsync(cancellationToken);

        if (existsSnake?.Count > 0)
        {
            return;
        }

        try
        {
            await context.Database.ExecuteSqlRawAsync(
                """
                INSERT INTO announcement_read_receipts (announcement_id, student_profile_id, read_at)
                VALUES ({0}, {1}, NOW())
                ON CONFLICT DO NOTHING
                """,
                announcementId,
                studentProfileId);
            return;
        }
        catch
        {
            // legacy PascalCase table
        }

        var existsLegacy = await context.Database
            .SqlQuery<CountRow>($"""
                SELECT COUNT(*)::int AS "Count"
                FROM announcement_read_receipts
                WHERE "AnnouncementId" = {announcementId} AND "StudentProfileId" = {studentProfileId}
                """)
            .FirstOrDefaultAsync(cancellationToken);

        if (existsLegacy?.Count > 0)
        {
            return;
        }

        await context.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO announcement_read_receipts ("Id", "AnnouncementId", "StudentProfileId", "ReadAtUtc")
            VALUES (gen_random_uuid(), {0}, {1}, NOW())
            """,
            announcementId,
            studentProfileId);
    }

    private static async Task<int> TryCountAsync(
        UserManagmentDbContext context,
        string sql,
        Guid tutorProfileId,
        CancellationToken cancellationToken)
    {
        try
        {
            var row = await context.Database.SqlQueryRaw<CountRow>(sql, tutorProfileId)
                .FirstOrDefaultAsync(cancellationToken);
            return row?.Count ?? 0;
        }
        catch
        {
            return 0;
        }
    }

    private static async Task<int> TryCountAsync(
        UserManagmentDbContext context,
        string sql,
        Guid tutorProfileId,
        Guid studentProfileId,
        CancellationToken cancellationToken)
    {
        try
        {
            var row = await context.Database.SqlQueryRaw<CountRow>(sql, tutorProfileId, studentProfileId)
                .FirstOrDefaultAsync(cancellationToken);
            return row?.Count ?? 0;
        }
        catch
        {
            return 0;
        }
    }

    private static async Task<List<AnnouncementRow>> TryListAsync(
        UserManagmentDbContext context,
        string sql,
        Guid tutorProfileId,
        CancellationToken cancellationToken)
    {
        try
        {
            return await context.Database.SqlQueryRaw<AnnouncementRow>(sql, tutorProfileId)
                .ToListAsync(cancellationToken);
        }
        catch
        {
            return [];
        }
    }

    private sealed class GuidRow
    {
        public Guid Value { get; set; }
    }

    private static async Task<HashSet<Guid>> GetReadAnnouncementIdsAsync(
        UserManagmentDbContext context,
        Guid studentProfileId,
        CancellationToken cancellationToken)
    {
        try
        {
            var ids = await context.Database
                .SqlQuery<GuidRow>($"""
                    SELECT announcement_id AS "Value"
                    FROM announcement_read_receipts
                    WHERE student_profile_id = {studentProfileId}
                    """)
                .Select(r => r.Value)
                .ToListAsync(cancellationToken);
            return ids.ToHashSet();
        }
        catch
        {
            try
            {
                var ids = await context.Database
                    .SqlQuery<GuidRow>($"""
                        SELECT "AnnouncementId" AS "Value"
                        FROM announcement_read_receipts
                        WHERE "StudentProfileId" = {studentProfileId}
                        """)
                    .Select(r => r.Value)
                    .ToListAsync(cancellationToken);
                return ids.ToHashSet();
            }
            catch
            {
                return [];
            }
        }
    }
}
