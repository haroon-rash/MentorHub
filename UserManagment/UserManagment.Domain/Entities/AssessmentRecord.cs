namespace UserManagment.Domain.Entities;

public class AssessmentRecord
{
    public Guid Id { get; set; }
    public Guid StudentProfileId { get; set; }
    public Guid? TutorProfileId { get; set; } // Optional: null if student self-reported
    
    public string SubmittedByUserId { get; set; } = string.Empty; // AuthUserId of submitter
    
    public string Title { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    
    // Hierarchical structure e.g., "Math > Algebra > Linear Equations"
    public string TopicTag { get; set; } = string.Empty; 
    
    public decimal ScoreObtained { get; set; }
    public decimal TotalScore { get; set; }
    
    public int? StudentConfidenceLevel { get; set; } // 1-5 scale
    
    public DateTime DateRecorded { get; set; } = DateTime.UtcNow;
    
    // Navigation Properties
    public StudentProfile StudentProfile { get; set; } = null!;
    public TutorProfile? TutorProfile { get; set; }
}
