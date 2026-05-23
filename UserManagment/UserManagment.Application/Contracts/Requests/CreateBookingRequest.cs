namespace UserManagment.Application.Contracts.Requests;

public class CreateBookingRequest
{
    public Guid TutorProfileId { get; set; }
    public DateTime BookingDate { get; set; }
    public string TimeSlot { get; set; } = string.Empty;
    public string SessionMode { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string? StudentNotes { get; set; }
    public string? BillingPlan { get; set; }
    public int? PlanMonths { get; set; }
}
