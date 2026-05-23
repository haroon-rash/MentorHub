using UserManagment.Domain.Entities;

namespace UserManagment.Application.Helpers;

/// <summary>
/// Detects recurring batch schedule conflicts (shared class days + overlapping times + overlapping package dates).
/// </summary>
public static class BatchScheduleHelper
{
    public static bool RecurringSchedulesOverlap(TutorBatch proposed, TutorBatch existing) =>
        RecurringSchedulesOverlap(
            proposed.StartDateUtc, proposed.EndDateUtc, proposed.DaysOfWeekCsv, proposed.StartTime, proposed.EndTime,
            existing.StartDateUtc, existing.EndDateUtc, existing.DaysOfWeekCsv, existing.StartTime, existing.EndTime);

    public static bool RecurringSchedulesOverlap(
        DateTime startA, DateTime endA, string daysCsvA, TimeOnly startTimeA, TimeOnly endTimeA,
        DateTime startB, DateTime endB, string daysCsvB, TimeOnly startTimeB, TimeOnly endTimeB)
    {
        if (endA.Date < startB.Date || endB.Date < startA.Date)
        {
            return false;
        }

        var daysA = ClassSessionGenerator.ParseDays(daysCsvA);
        var daysB = ClassSessionGenerator.ParseDays(daysCsvB);
        if (daysA.Count == 0 || daysB.Count == 0 || !daysA.Overlaps(daysB))
        {
            return false;
        }

        return TimeRangesOverlap(startTimeA, endTimeA, startTimeB, endTimeB);
    }

    public static bool ConflictsWithSingleSession(TutorBatch activeBatch, DateTime sessionDateUtc, string timeSlot)
    {
        if (sessionDateUtc.Date < activeBatch.StartDateUtc.Date || sessionDateUtc.Date > activeBatch.EndDateUtc.Date)
        {
            return false;
        }

        var batchDays = ClassSessionGenerator.ParseDays(activeBatch.DaysOfWeekCsv);
        if (batchDays.Count > 0 && !batchDays.Contains(sessionDateUtc.DayOfWeek))
        {
            return false;
        }

        if (!BookingTimeSlotHelper.TryParse(timeSlot, sessionDateUtc, out var sessionStart, out var sessionEnd))
        {
            var label = $"{activeBatch.StartTime:HH:mm} - {activeBatch.EndTime:HH:mm}";
            return string.Equals(Normalize(timeSlot), Normalize(label), StringComparison.OrdinalIgnoreCase);
        }

        var batchStart = sessionDateUtc.Date.Add(activeBatch.StartTime.ToTimeSpan());
        var batchEnd = sessionDateUtc.Date.Add(activeBatch.EndTime.ToTimeSpan());
        if (batchEnd <= batchStart)
        {
            batchEnd = batchEnd.AddDays(1);
        }

        return sessionStart < batchEnd && batchStart < sessionEnd;
    }

    public static bool TimeRangesOverlap(TimeOnly startA, TimeOnly endA, TimeOnly startB, TimeOnly endB) =>
        startA < endB && startB < endA;

    public static string FormatDays(string? daysCsv)
    {
        if (string.IsNullOrWhiteSpace(daysCsv))
        {
            return "scheduled days";
        }

        var parts = daysCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return parts.Length == 0 ? "scheduled days" : string.Join(", ", parts);
    }

    public static string FormatTimeRange(TimeOnly start, TimeOnly end) =>
        $"{start:HH:mm}–{end:HH:mm}";

    public static string FormatTimeRange(string startTime, string endTime)
    {
        if (TimeOnly.TryParse(startTime, out var s) && TimeOnly.TryParse(endTime, out var e))
        {
            return FormatTimeRange(s, e);
        }

        return $"{startTime}–{endTime}";
    }

    private static string Normalize(string slot) =>
        slot.Replace('–', '-').Replace('—', '-').Trim();
}
