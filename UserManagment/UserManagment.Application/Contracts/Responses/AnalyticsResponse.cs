namespace UserManagment.Application.Contracts.Responses;

public class AnalyticsResponse
{
    public int TotalUsers { get; set; }
    public int TotalTutors { get; set; }
    public int TotalStudents { get; set; }
    public int ApprovedTutors { get; set; }
    public int PendingTutors { get; set; }
    public int TotalBookings { get; set; }
    public int PendingBookings { get; set; }
    public int ConfirmedBookings { get; set; }
    public int CompletedBookings { get; set; }
    public int CancelledBookings { get; set; }
    public decimal TotalRevenue { get; set; }
    public int BookingsThisWeek { get; set; }
    public int NewUsersThisWeek { get; set; }
    public int TotalReviews { get; set; }
    public double AveragePlatformRating { get; set; }
}
