namespace UserManagment.Application.Contracts.Responses;

public class TutorStudentSummaryResponse
{
    public Guid StudentProfileId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Subject { get; set; } = string.Empty;
    public decimal Fee { get; set; }
    public string TimeSlot { get; set; } = string.Empty;
    public DateTime BookingDate { get; set; }
    public string BookingStatus { get; set; } = string.Empty;
    public Guid LatestBookingId { get; set; }
    public int TotalSessions { get; set; }
}
