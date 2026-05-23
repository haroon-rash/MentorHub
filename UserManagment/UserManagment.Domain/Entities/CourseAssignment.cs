using UserManagment.Domain.Enums;

namespace UserManagment.Domain.Entities;

public class CourseAssignment
{
    public Guid Id { get; set; }
    public Guid TutorProfileId { get; set; }
    public Guid? TutorBatchId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public string? GradingRubric { get; set; }
    public string? AttachmentUrlsCsv { get; set; }
    public decimal TotalMarks { get; set; }
    public DateTime DueDateUtc { get; set; }
    public AssignmentWorkflowStatus Status { get; set; }
    /// <summary>ALL, BATCH, or comma-separated student profile ids</summary>
    public string VisibilityRule { get; set; } = "BATCH";
    public bool AllowResubmission { get; set; }
    public bool AllowLateSubmission { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public virtual TutorProfile TutorProfile { get; set; } = null!;
    public virtual TutorBatch? TutorBatch { get; set; }
    public virtual ICollection<AssignmentSubmission> Submissions { get; set; } = new List<AssignmentSubmission>();
}
