using UserManagment.Domain.Enums;

namespace UserManagment.Domain.Entities;

/// <summary>
/// Auto-generated class occurrence from batch schedule between start and end dates.
/// </summary>
public class GeneratedClassSession
{
    public Guid Id { get; set; }
    public Guid TutorBatchId { get; set; }
    public Guid TutorProfileId { get; set; }

    public DateTime SessionDateUtc { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string TimeSlotLabel { get; set; } = string.Empty;
    public ClassSessionStatus Status { get; set; }
    public string? MeetingLink { get; set; }
    public string? Location { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public virtual TutorBatch TutorBatch { get; set; } = null!;
}
