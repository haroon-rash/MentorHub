using UserManagment.Domain.Enums;

namespace UserManagment.Domain.Entities;

public class AssignmentSubmission
{
    public Guid Id { get; set; }
    public Guid CourseAssignmentId { get; set; }
    public Guid StudentProfileId { get; set; }
    public string? SubmissionText { get; set; }
    public string? FileUrlsCsv { get; set; }
    public SubmissionStatus Status { get; set; }
    public decimal? MarksObtained { get; set; }
    public string? GradeLetter { get; set; }
    public decimal? Percentage { get; set; }
    public string? TutorFeedback { get; set; }
    public string? ReviewedFileUrlsCsv { get; set; }
    public DateTime? SubmittedAtUtc { get; set; }
    public DateTime? GradedAtUtc { get; set; }
    public int ResubmissionCount { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public virtual CourseAssignment CourseAssignment { get; set; } = null!;
    public virtual StudentProfile StudentProfile { get; set; } = null!;
}
