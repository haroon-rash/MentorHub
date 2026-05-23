using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Helpers;

public static class MeetingLinkProvisioner
{
    public static void EnsureSessionMeetingLinks(TutorBatch batch, IEnumerable<GeneratedClassSession> sessions)
    {
        if (batch.SessionMode != BatchSessionMode.Online)
        {
            return;
        }

        foreach (var session in sessions)
        {
            if (string.IsNullOrWhiteSpace(session.MeetingLink))
            {
                session.MeetingLink = $"https://meet.jit.si/mentorhub-{session.Id:N}";
                session.UpdatedAtUtc = DateTime.UtcNow;
            }
        }
    }

    public static bool LooksLikeUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        return value.Contains("http://", StringComparison.OrdinalIgnoreCase) ||
               value.Contains("https://", StringComparison.OrdinalIgnoreCase) ||
               value.Contains("meet.", StringComparison.OrdinalIgnoreCase) ||
               value.Contains("zoom.us", StringComparison.OrdinalIgnoreCase) ||
               value.Contains("teams.microsoft", StringComparison.OrdinalIgnoreCase);
    }
}
