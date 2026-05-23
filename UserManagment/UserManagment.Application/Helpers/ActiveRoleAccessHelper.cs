namespace UserManagment.Application.Helpers;

/// <summary>
/// Service-layer guard: dual-profile users must use the correct active role for reads/writes.
/// </summary>
public static class ActiveRoleAccessHelper
{
    public static void EnsureStudentMode(string activeRole)
    {
        if (!string.Equals(activeRole, "STUDENT", StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException(
                "Switch to Student mode to access student enrollments and courses.");
        }
    }

    public static void EnsureTutorMode(string activeRole)
    {
        if (!string.Equals(activeRole, "TUTOR", StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException(
                "Switch to Tutor mode to access teaching and tutor management features.");
        }
    }
}
