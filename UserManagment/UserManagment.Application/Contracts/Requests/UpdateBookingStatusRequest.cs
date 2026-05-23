namespace UserManagment.Application.Contracts.Requests;

public class UpdateBookingStatusRequest
{
    public string? Reason { get; set; }
    public string? TutorNotes { get; set; }
}
