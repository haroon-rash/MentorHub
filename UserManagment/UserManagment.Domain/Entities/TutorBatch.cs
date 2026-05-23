using UserManagment.Domain.Enums;

namespace UserManagment.Domain.Entities;

/// <summary>
/// Tutor-defined course/batch (e.g. Math Mon/Wed/Fri 5–6 PM, 19 May – 19 Jun).
/// </summary>
public class TutorBatch
{
    public Guid Id { get; set; }
    public Guid TutorProfileId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? LearningObjectives { get; set; }
    public string? DifficultyLevel { get; set; }

    public DateTime StartDateUtc { get; set; }
    public DateTime EndDateUtc { get; set; }
    /// <summary>Comma-separated day names, e.g. Monday,Wednesday,Friday</summary>
    public string DaysOfWeekCsv { get; set; } = string.Empty;
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    public decimal PackageFee { get; set; }
    public int MaxStudents { get; set; } = 20;
    public BatchSessionMode SessionMode { get; set; }
    public string? LocationOrMeetingInfo { get; set; }

    public bool IsPublished { get; set; } = true;
    public bool IsDeleted { get; set; }
    public BatchLifecycleStatus LifecycleStatus { get; set; } = BatchLifecycleStatus.Active;
    /// <summary>PUBLIC or PRIVATE — controls discoverability before enrollment.</summary>
    public string Visibility { get; set; } = "PUBLIC";
    public string? AssignmentRules { get; set; }
    public string? InPersonAddress { get; set; }
    public string? InPersonBuildingDetails { get; set; }
    public string? LocationNotes { get; set; }
    /// <summary>Platform instructions only — never expose live meeting URLs publicly.</summary>
    public string? OnlineMeetingInstructions { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public virtual TutorProfile TutorProfile { get; set; } = null!;
    public virtual ICollection<BatchEnrollment> Enrollments { get; set; } = new List<BatchEnrollment>();
    public virtual ICollection<GeneratedClassSession> ClassSessions { get; set; } = new List<GeneratedClassSession>();
}
