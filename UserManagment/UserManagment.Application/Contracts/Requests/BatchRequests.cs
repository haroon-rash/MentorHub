namespace UserManagment.Application.Contracts.Requests;

public class CreateTutorBatchRequest
{
    public string Title { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? LearningObjectives { get; set; }
    public string? DifficultyLevel { get; set; }
    public DateTime StartDateUtc { get; set; }
    public DateTime EndDateUtc { get; set; }
    public string DaysOfWeekCsv { get; set; } = string.Empty;
    public string StartTime { get; set; } = "17:00";
    public string EndTime { get; set; } = "18:00";
    public decimal PackageFee { get; set; }
    public int MaxStudents { get; set; } = 20;
    public string SessionMode { get; set; } = "Online";
    public string? LocationOrMeetingInfo { get; set; }
    public string? InPersonAddress { get; set; }
    public string? InPersonBuildingDetails { get; set; }
    public string? LocationNotes { get; set; }
    public string? OnlineMeetingInstructions { get; set; }
    public string Visibility { get; set; } = "PUBLIC";
    public string? AssignmentRules { get; set; }
}

public class UpdateTutorBatchRequest : CreateTutorBatchRequest
{
    public bool IsPublished { get; set; } = true;
}

public class DeleteTutorBatchRequest
{
    public bool Force { get; set; }
    public bool ArchiveInstead { get; set; } = true;
}

public class EnrollInBatchRequest
{
    public string? StudentNotes { get; set; }
}

public class CreatePackageEnrollmentRequest
{
    public Guid TutorProfileId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public DateTime StartDateUtc { get; set; }
    public int PlanMonths { get; set; } = 1;
    public string DaysOfWeekCsv { get; set; } = string.Empty;
    public string StartTime { get; set; } = "17:00";
    public string EndTime { get; set; } = "18:00";
    public string SessionMode { get; set; } = "Video Session";
    public string? StudentNotes { get; set; }
}

public class CreateCourseAssignmentRequest
{
    public Guid? TutorBatchId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public string? GradingRubric { get; set; }
    public string? AttachmentUrlsCsv { get; set; }
    public decimal TotalMarks { get; set; } = 100;
    public DateTime DueDateUtc { get; set; }
    public string VisibilityRule { get; set; } = "BATCH";
    public bool AllowResubmission { get; set; }
    public bool AllowLateSubmission { get; set; }
    public IReadOnlyList<Guid>? TargetStudentProfileIds { get; set; }
}

public class UpdateCourseAssignmentRequest
{
    public string Title { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public string? GradingRubric { get; set; }
    public string? AttachmentUrlsCsv { get; set; }
    public decimal TotalMarks { get; set; } = 100;
    public bool AllowResubmission { get; set; }
    public bool AllowLateSubmission { get; set; }
}

public class ExtendAssignmentDeadlineRequest
{
    public DateTime DueDateUtc { get; set; }
}

public class AssignmentActionRequest
{
    public string? Reason { get; set; }
}

public class SubmitAssignmentRequest
{
    public string? SubmissionText { get; set; }
    public string? FileUrlsCsv { get; set; }
}

public class GradeSubmissionRequest
{
    public decimal MarksObtained { get; set; }
    public string? TutorFeedback { get; set; }
    public string? ReviewedFileUrlsCsv { get; set; }
    public bool Approve { get; set; } = true;
    public bool ReturnForCorrection { get; set; }
}

public class SubmissionQueryRequest
{
    public Guid? BatchId { get; set; }
    public Guid? AssignmentId { get; set; }
    public Guid? StudentProfileId { get; set; }
    public string? SubmissionStatus { get; set; }
    public string? ReviewStatus { get; set; }
    public string? GradingStatus { get; set; }
    public bool? IsLate { get; set; }
    public DateTime? WeekStartUtc { get; set; }
    public DateTime? MonthStartUtc { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class CreateStudyMaterialRequest
{
    public Guid? TutorBatchId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Topic { get; set; }
    public string? Module { get; set; }
    public string? Chapter { get; set; }
    public string? TagsCsv { get; set; }
    public string FileUrlsCsv { get; set; } = string.Empty;
}

public class UpdateStudyMaterialRequest : CreateStudyMaterialRequest
{
}

public class CreateTutorGoalRequest
{
    public Guid StudentProfileId { get; set; }
    public Guid? TutorBatchId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Priority { get; set; } = "Medium";
    public DateTime? TargetDate { get; set; }
    public string? AttachmentUrlsCsv { get; set; }
}
