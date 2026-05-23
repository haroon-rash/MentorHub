namespace UserManagment.Application.Contracts.Requests;

public class CreateReviewRequest
{
    public Guid TutorProfileId { get; set; }
    public Guid BookingId { get; set; }
    public int Rating { get; set; }   // 1–5
    public string Comment { get; set; } = string.Empty;
}
