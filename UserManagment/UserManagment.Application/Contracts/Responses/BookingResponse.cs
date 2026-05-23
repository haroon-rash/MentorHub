namespace UserManagment.Application.Contracts.Responses;

public class BookingResponse
{
    public Guid Id { get; set; }
    public Guid TutorProfileId { get; set; }
    public string TutorName { get; set; } = string.Empty;
    public string TutorProfilePhotoUrl { get; set; } = string.Empty;
    public Guid StudentProfileId { get; set; }
    public string StudentName { get; set; } = string.Empty;

    public DateTime BookingDate { get; set; }
    public string TimeSlot { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string SessionMode { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public decimal Fee { get; set; }
    public string? MeetingLink { get; set; }
    /// <summary>In-person address or online meeting note from tutor profile (when confirmed).</summary>
    public string? LocationOrMeetingInfo { get; set; }
    public string? StudentNotes { get; set; }
    public string? TutorNotes { get; set; }
    public string? CancellationReason { get; set; }
    public string? CancelledBy { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
