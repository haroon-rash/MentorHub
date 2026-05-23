namespace UserManagment.Domain.Entities;

public class LearningGoal
{
    public Guid Id { get; set; }
    public Guid StudentProfileId { get; set; }
    public Guid? TutorProfileId { get; set; }
    public Guid? TutorBatchId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? TargetDate { get; set; }
    public string Priority { get; set; } = "Medium";
    public int CompletionPercent { get; set; }
    public string? Remarks { get; set; }
    public string? AttachmentUrlsCsv { get; set; }

    // Status: Not Started, In Progress, Achieved, Cancelled
    public string Status { get; set; } = "Not Started";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public StudentProfile StudentProfile { get; set; } = null!;
}
