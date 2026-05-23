using System.Globalization;

namespace UserManagment.Application.Helpers;

public static class BookingTimeSlotHelper
{
    public static bool TryParse(string timeSlot, DateTime bookingDate, out DateTime startUtc, out DateTime endUtc)
    {
        startUtc = default;
        endUtc = default;
        if (string.IsNullOrWhiteSpace(timeSlot))
        {
            return false;
        }

        var normalized = timeSlot
            .Replace('–', '-')
            .Replace('—', '-')
            .Trim();

        var parts = normalized.Split('-', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 2)
        {
            return false;
        }

        if (!TryParseTimeOnDate(parts[0], bookingDate, out startUtc) || !TryParseTimeOnDate(parts[1], bookingDate, out endUtc))
        {
            return false;
        }

        if (endUtc <= startUtc)
        {
            endUtc = endUtc.AddDays(1);
        }

        return true;
    }

    public static bool Overlaps(string slotA, DateTime dateA, string slotB, DateTime dateB)
    {
        if (!TryParse(slotA, dateA, out var aStart, out var aEnd))
        {
            return string.Equals(Normalize(slotA), Normalize(slotB), StringComparison.OrdinalIgnoreCase)
                   && dateA.Date == dateB.Date;
        }

        if (!TryParse(slotB, dateB, out var bStart, out var bEnd))
        {
            return false;
        }

        return aStart < bEnd && bStart < aEnd;
    }

    private static string Normalize(string slot) =>
        slot.Replace('–', '-').Replace('—', '-').Trim();

    private static bool TryParseTimeOnDate(string timeText, DateTime date, out DateTime resultUtc)
    {
        resultUtc = default;
        var dateOnly = date.Date;
        var combined = $"{dateOnly:yyyy-MM-dd} {timeText.Trim()}";

        if (DateTime.TryParse(combined, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out var parsed))
        {
            resultUtc = DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
            return true;
        }

        if (DateTime.TryParse(combined, CultureInfo.CurrentCulture, DateTimeStyles.AllowWhiteSpaces, out parsed))
        {
            resultUtc = DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
            return true;
        }

        return false;
    }
}
