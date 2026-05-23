namespace UserManagment.Domain.Entities;

public class SessionAttendance
{
    public Guid Id { get; set; }
    public Guid GeneratedClassSessionId { get; set; }
    public Guid StudentProfileId { get; set; }
    public Guid BatchEnrollmentId { get; set; }
    public bool IsPresent { get; set; }
    public string? Notes { get; set; }
    public DateTime RecordedAtUtc { get; set; }

    public virtual GeneratedClassSession ClassSession { get; set; } = null!;
    public virtual BatchEnrollment Enrollment { get; set; } = null!;
}
