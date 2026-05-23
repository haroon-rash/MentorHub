namespace UserManagment.Application.Contracts.Responses;

public class LearningGoalResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? TargetDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}

public class AssessmentRecordResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string TopicTag { get; set; } = string.Empty;
    public decimal ScoreObtained { get; set; }
    public decimal TotalScore { get; set; }
    public decimal ScorePercentage { get; set; }
    public int? StudentConfidenceLevel { get; set; }
    public string SubmittedByUserId { get; set; } = string.Empty;
    public DateTime DateRecorded { get; set; }
}

public class SessionNoteResponse
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public string TutorFullName { get; set; } = string.Empty;
    public string TopicsCovered { get; set; } = string.Empty;
    public string Remarks { get; set; } = string.Empty;
    public string? AreasForImprovement { get; set; }
    public string[]? ResourceLinks { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class StudentProgressResponse
{
    public IReadOnlyCollection<LearningGoalResponse> Goals { get; set; } = Array.Empty<LearningGoalResponse>();
    public IReadOnlyCollection<AssessmentRecordResponse> Assessments { get; set; } = Array.Empty<AssessmentRecordResponse>();
    public IReadOnlyCollection<SessionNoteResponse> SessionNotes { get; set; } = Array.Empty<SessionNoteResponse>();
    public WeakSubjectResponse[] WeakSubjects { get; set; } = Array.Empty<WeakSubjectResponse>();
}

public class WeakSubjectResponse
{
    public string Subject { get; set; } = string.Empty;
    public string TopicTag { get; set; } = string.Empty;
    public decimal AverageScore { get; set; }
}
