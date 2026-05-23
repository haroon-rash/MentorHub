namespace UserManagment.Domain.Entities;

public class SessionNote
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public Guid StudentProfileId { get; set; }
    public Guid TutorProfileId { get; set; }
    
    public string TopicsCovered { get; set; } = string.Empty;
    public string Remarks { get; set; } = string.Empty;
    public string? AreasForImprovement { get; set; }
    
    // Comma separated list of resource URLs attached by the tutor
    public string? ResourceLinksCsv { get; set; }
    
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    
    // Navigation Properties
    public Booking Booking { get; set; } = null!;
    public StudentProfile StudentProfile { get; set; } = null!;
    public TutorProfile TutorProfile { get; set; } = null!;
}
