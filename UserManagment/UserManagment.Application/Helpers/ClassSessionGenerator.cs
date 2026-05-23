using UserManagment.Domain.Entities;

namespace UserManagment.Application.Helpers;

public static class ClassSessionGenerator
{
    private static readonly Dictionary<string, DayOfWeek> DayMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Sunday"] = DayOfWeek.Sunday,
        ["Monday"] = DayOfWeek.Monday,
        ["Tuesday"] = DayOfWeek.Tuesday,
        ["Wednesday"] = DayOfWeek.Wednesday,
        ["Thursday"] = DayOfWeek.Thursday,
        ["Friday"] = DayOfWeek.Friday,
        ["Saturday"] = DayOfWeek.Saturday,
        ["Sun"] = DayOfWeek.Sunday,
        ["Mon"] = DayOfWeek.Monday,
        ["Tue"] = DayOfWeek.Tuesday,
        ["Wed"] = DayOfWeek.Wednesday,
        ["Thu"] = DayOfWeek.Thursday,
        ["Fri"] = DayOfWeek.Friday,
        ["Sat"] = DayOfWeek.Saturday,
    };

    public static IReadOnlyList<GeneratedClassSession> GenerateForBatch(TutorBatch batch)
    {
        var days = ParseDays(batch.DaysOfWeekCsv);
        if (days.Count == 0)
        {
            return Array.Empty<GeneratedClassSession>();
        }

        var sessions = new List<GeneratedClassSession>();
        var start = batch.StartDateUtc.Date;
        var end = batch.EndDateUtc.Date;
        if (end < start)
        {
            return sessions;
        }

        for (var date = start; date <= end; date = date.AddDays(1))
        {
            if (!days.Contains(date.DayOfWeek))
            {
                continue;
            }

            var slotLabel = $"{batch.StartTime:hh\\:mm} - {batch.EndTime:hh\\:mm}";
            sessions.Add(new GeneratedClassSession
            {
                Id = Guid.NewGuid(),
                TutorBatchId = batch.Id,
                TutorProfileId = batch.TutorProfileId,
                SessionDateUtc = DateTime.SpecifyKind(date, DateTimeKind.Utc),
                StartTime = batch.StartTime,
                EndTime = batch.EndTime,
                TimeSlotLabel = slotLabel,
                Status = Domain.Enums.ClassSessionStatus.Scheduled,
                Location = batch.SessionMode == Domain.Enums.BatchSessionMode.InPerson
                    ? (batch.InPersonAddress ?? batch.LocationOrMeetingInfo)
                    : null,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow,
            });
        }

        return sessions;
    }

    public static HashSet<DayOfWeek> ParseDays(string? daysCsv)
    {
        var result = new HashSet<DayOfWeek>();
        if (string.IsNullOrWhiteSpace(daysCsv))
        {
            return result;
        }

        foreach (var part in daysCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (DayMap.TryGetValue(part, out var dow))
            {
                result.Add(dow);
            }
        }

        return result;
    }
}
