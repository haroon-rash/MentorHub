namespace UserManagment.Application.Contracts.Responses;

public class SuperAdminDashboardResponse
{
    public int TotalTutorRequests { get; set; }
    public int PendingTutorRequests { get; set; }
    public int ApprovedTutors { get; set; }
    public int RejectedTutors { get; set; }
    public IReadOnlyCollection<TutorRequestSummaryResponse> LatestRequests { get; set; } = Array.Empty<TutorRequestSummaryResponse>();

    // New Advanced Metrics
    public decimal TotalRevenue { get; set; }
    public decimal AverageSessionPrice { get; set; }
    public int TotalStudents { get; set; }
    public int TotalTutors { get; set; }
    public int PendingBookings { get; set; }
    public int ConfirmedBookings { get; set; }
}
