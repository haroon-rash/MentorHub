namespace UserManagment.Application.Contracts.Responses;

public class StudentTutorSummaryResponse
{
    public Guid TutorProfileId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? ProfilePhotoUrl { get; set; }
    public string Subject { get; set; } = string.Empty;
    public decimal HourlyFee { get; set; }
    public double? AverageRating { get; set; }
    public int AnnouncementCount { get; set; }
    public int UnreadAnnouncementCount { get; set; }
    public string BookingStatus { get; set; } = string.Empty;
    public DateTime BookingDate { get; set; }
    public int TotalSessions { get; set; }
}
