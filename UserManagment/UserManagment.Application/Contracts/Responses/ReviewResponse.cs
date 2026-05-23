namespace UserManagment.Application.Contracts.Responses;

public class ReviewResponse
{
    public Guid Id { get; set; }
    public Guid? BookingId { get; set; }
    public Guid? BatchEnrollmentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string? StudentPhotoUrl { get; set; }
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}
