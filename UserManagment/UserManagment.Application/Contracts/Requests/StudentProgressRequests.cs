namespace UserManagment.Application.Contracts.Requests;

public class AddLearningGoalRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? TargetDate { get; set; }
}

public class UpdateGoalStatusRequest
{
    // "Not Started" | "In Progress" | "Achieved"
    public string Status { get; set; } = string.Empty;
}

public class AddAssessmentRecordRequest
{
    public string Title { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string TopicTag { get; set; } = string.Empty;
    public decimal ScoreObtained { get; set; }
    public decimal TotalScore { get; set; }
    public int? StudentConfidenceLevel { get; set; } // 1-5
    public DateTime? DateRecorded { get; set; }
    // StudentProfileId is resolved from the target student, not from this request body
    public Guid? StudentProfileId { get; set; } // Required when a tutor adds a record for a specific student
}

public class AddSessionNoteRequest
{
    public Guid BookingId { get; set; }
    public Guid StudentProfileId { get; set; }
    public string TopicsCovered { get; set; } = string.Empty;
    public string Remarks { get; set; } = string.Empty;
    public string? AreasForImprovement { get; set; }
    public string? ResourceLinksCsv { get; set; }
}
