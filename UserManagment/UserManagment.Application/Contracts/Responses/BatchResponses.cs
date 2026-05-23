namespace UserManagment.Application.Contracts.Responses;

public class TutorBatchResponse
{
    public Guid Id { get; set; }
    public Guid TutorProfileId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? LearningObjectives { get; set; }
    public DateTime StartDateUtc { get; set; }
    public DateTime EndDateUtc { get; set; }
    public string DaysOfWeekCsv { get; set; } = string.Empty;
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public string ScheduleLabel { get; set; } = string.Empty;
    public decimal PackageFee { get; set; }
    public int MaxStudents { get; set; }
    public int EnrolledCount { get; set; }
    public int SeatsAvailable { get; set; }
    public string SessionMode { get; set; } = string.Empty;
    public bool IsOnline { get; set; }
    public string? LocationOrMeetingInfo { get; set; }
    public string? InPersonAddress { get; set; }
    public string? InPersonBuildingDetails { get; set; }
    public string? LocationNotes { get; set; }
    public string? OnlineMeetingInstructions { get; set; }
    public string Visibility { get; set; } = "PUBLIC";
    public string? AssignmentRules { get; set; }
    public string LifecycleStatus { get; set; } = "Active";
    public bool IsPublished { get; set; } = true;
    public int SessionCount { get; set; }
    public bool IsFull { get; set; }
    public bool HasMeetingAccess { get; set; }
}

public class BatchRosterStudentResponse
{
    public Guid EnrollmentId { get; set; }
    public Guid StudentProfileId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime EnrolledAtUtc { get; set; }
    public decimal AmountPaid { get; set; }
}

public class TutorBatchDetailResponse : TutorBatchResponse
{
    public IReadOnlyList<BatchRosterStudentResponse> Students { get; set; } = Array.Empty<BatchRosterStudentResponse>();
}

public class EnrollmentEligibilityResponse
{
    public bool CanEnroll { get; set; }
    public string? Message { get; set; }

    public static EnrollmentEligibilityResponse Allowed() => new() { CanEnroll = true };

    public static EnrollmentEligibilityResponse Blocked(string message) =>
        new() { CanEnroll = false, Message = message };
}

public class BatchEnrollmentResponse
{
    public Guid Id { get; set; }
    public Guid TutorBatchId { get; set; }
    public Guid StudentProfileId { get; set; }
    public Guid TutorProfileId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string BatchTitle { get; set; } = string.Empty;
    public string TutorName { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public DateTime StartDateUtc { get; set; }
    public DateTime EndDateUtc { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal AmountPaid { get; set; }
    public int PlanMonths { get; set; }
    public decimal MonthlyFeeAmount { get; set; }
    public DateTime? CompletionDateUtc { get; set; }
    public DateTime? EffectiveEndDateUtc { get; set; }
    public DateTime? WithdrawalRequestedAtUtc { get; set; }
    public string? WithdrawalReason { get; set; }
    public int UpcomingSessionCount { get; set; }
    public string DaysOfWeekCsv { get; set; } = string.Empty;
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public string ScheduleLabel { get; set; } = string.Empty;
    public string SessionMode { get; set; } = string.Empty;
    public string? LocationOrMeetingInfo { get; set; }
}

public class GeneratedClassSessionResponse
{
    public Guid Id { get; set; }
    public Guid TutorBatchId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public DateTime SessionDateUtc { get; set; }
    public string TimeSlotLabel { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? MeetingLink { get; set; }
    public string? Location { get; set; }
}

public class CourseAssignmentResponse
{
    public Guid Id { get; set; }
    public Guid? TutorBatchId { get; set; }
    public string? BatchTitle { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public string? GradingRubric { get; set; }
    public string? AttachmentUrlsCsv { get; set; }
    public decimal TotalMarks { get; set; }
    public DateTime DueDateUtc { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsOverdue { get; set; }
    public bool AllowResubmission { get; set; }
    public bool AllowLateSubmission { get; set; }
    public bool CanEdit { get; set; }
    public bool IsEditLocked { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public string? SubmissionStatus { get; set; }
    public decimal? MarksObtained { get; set; }
    public string? GradeLetter { get; set; }
    public decimal? Percentage { get; set; }
    public string? TutorFeedback { get; set; }
    public string? SubmittedFileUrlsCsv { get; set; }
    public DateTime? SubmittedAtUtc { get; set; }
    public bool IsLate { get; set; }
}

public class AssignmentSubmissionResponse
{
    public Guid Id { get; set; }
    public Guid CourseAssignmentId { get; set; }
    public string AssignmentTitle { get; set; } = string.Empty;
    public Guid? TutorBatchId { get; set; }
    public string? BatchTitle { get; set; }
    public Guid StudentProfileId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? SubmissionText { get; set; }
    public string? FileUrlsCsv { get; set; }
    public int FileCount { get; set; }
    public decimal? MarksObtained { get; set; }
    public string? GradeLetter { get; set; }
    public decimal? Percentage { get; set; }
    public string? TutorFeedback { get; set; }
    public string? ReviewedFileUrlsCsv { get; set; }
    public DateTime? SubmittedAtUtc { get; set; }
    public DateTime? GradedAtUtc { get; set; }
    public DateTime DueDateUtc { get; set; }
    public bool IsLate { get; set; }
    public int ResubmissionCount { get; set; }
    public decimal TotalMarks { get; set; }
}

public class PaginatedSubmissionsResponse
{
    public IReadOnlyList<AssignmentSubmissionResponse> Items { get; set; } = Array.Empty<AssignmentSubmissionResponse>();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
    public bool HasNext { get; set; }
    public bool HasPrevious { get; set; }
    public SubmissionAnalyticsResponse Analytics { get; set; } = new();
}

public class SubmissionAnalyticsResponse
{
    public int TotalAssignments { get; set; }
    public int PendingCount { get; set; }
    public int LateCount { get; set; }
    public int MissingCount { get; set; }
    public int ReviewedCount { get; set; }
    public int GradedCount { get; set; }
}

public class StudyMaterialResponse
{
    public Guid Id { get; set; }
    public Guid? TutorBatchId { get; set; }
    public string? BatchTitle { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Topic { get; set; }
    public string? Module { get; set; }
    public string? Chapter { get; set; }
    public string? TagsCsv { get; set; }
    public string FileUrlsCsv { get; set; } = string.Empty;
    public string TutorName { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}

public class EnrolledStudentDetailResponse
{
    public Guid StudentProfileId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? GradeLevel { get; set; }
    public IReadOnlyList<string> EnrolledSubjects { get; set; } = Array.Empty<string>();
    public decimal AttendanceRate { get; set; }
    public decimal AssignmentCompletionRate { get; set; }
    public decimal AverageGrade { get; set; }
    public decimal ProgressPercentage { get; set; }
    public DateTime? JoinedDateUtc { get; set; }
    public IReadOnlyList<AssignmentSubmissionResponse> RecentSubmissions { get; set; } = Array.Empty<AssignmentSubmissionResponse>();
    public IReadOnlyList<CourseAssignmentResponse> PendingAssignments { get; set; } = Array.Empty<CourseAssignmentResponse>();
    public string? TutorNotes { get; set; }
}

public class StudentPerformanceSummaryResponse
{
    public Guid StudentProfileId { get; set; }
    public decimal ProgressPercentage { get; set; }
    public decimal AverageAssignmentScore { get; set; }
    public decimal AttendanceRate { get; set; }
    public int GoalsAchieved { get; set; }
    public int GoalsTotal { get; set; }
    public IReadOnlyList<string> WeakSubjects { get; set; } = Array.Empty<string>();
}
