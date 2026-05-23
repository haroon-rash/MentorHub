using UserManagment.Domain.Enums;

namespace UserManagment.Domain.Entities;

public class Booking
{
    public Guid Id { get; set; }
    public Guid TutorProfileId { get; set; }
    public Guid StudentProfileId { get; set; }
    
    public DateTime BookingDate { get; set; }
    public string TimeSlot { get; set; } = string.Empty;
    public BookingStatus Status { get; set; }
    public string SessionMode { get; set; } = string.Empty; // Video, In-Person
    public string Subject { get; set; } = string.Empty;
    public decimal Fee { get; set; }
    public string? MeetingLink { get; set; }
    public string? StudentNotes { get; set; }
    public string? TutorNotes { get; set; }
    public string? CancellationReason { get; set; }
    public string? CancelledBy { get; set; } // "student" | "tutor"
    
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    // Navigation properties
    public virtual TutorProfile TutorProfile { get; set; } = null!;
    public virtual StudentProfile StudentProfile { get; set; } = null!;
}
