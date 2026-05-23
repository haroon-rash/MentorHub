namespace UserManagment.Application.Contracts.Responses;

public class TutorDashboardStatsResponse
{
    public int TotalBookings { get; set; }
    public int PendingBookings { get; set; }
    public int ConfirmedBookings { get; set; }
    public int CompletedBookings { get; set; }
    public int CancelledBookings { get; set; }
    public decimal TotalEarnings { get; set; }
    public decimal EarningsThisMonth { get; set; }
    public int SessionsThisMonth { get; set; }
    public IReadOnlyCollection<BookingResponse> UpcomingBookings { get; set; } = Array.Empty<BookingResponse>();
    public IReadOnlyCollection<BookingResponse> PendingRequests { get; set; } = Array.Empty<BookingResponse>();
}
