using UserManagment.Domain.Entities;

namespace UserManagment.Application.Helpers;

public static class TutorSubjectValidator
{
    public static IReadOnlyList<string> ParseSubjects(string? subjectsCsv)
    {
        if (string.IsNullOrWhiteSpace(subjectsCsv))
        {
            return Array.Empty<string>();
        }

        return subjectsCsv
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public static void EnsureSubjectAllowed(TutorProfile tutor, string subject)
    {
        var allowed = ParseSubjects(tutor.SubjectsCsv);
        if (allowed.Count == 0)
        {
            throw new InvalidOperationException("Add subjects to your tutor profile before creating batches or materials.");
        }

        if (!allowed.Any(s => string.Equals(s, subject.Trim(), StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException(
                $"Subject \"{subject}\" is not in your profile. Select one of: {string.Join(", ", allowed)}.");
        }
    }
}
