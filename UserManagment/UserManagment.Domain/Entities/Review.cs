using UserManagment.Domain.Enums;

namespace UserManagment.Domain.Entities;

public class Review
{
    public Guid Id { get; set; }
    public Guid StudentProfileId { get; set; }
    public Guid TutorProfileId { get; set; }
    public Guid? BookingId { get; set; }
    public Guid? BatchEnrollmentId { get; set; }
    public ReviewType ReviewType { get; set; }

    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public string? Sentiment { get; set; }
    public decimal? SentimentConfidence { get; set; }
    public DateTime? ReviewWindowExpiresAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public StudentProfile StudentProfile { get; set; } = null!;
    public TutorProfile TutorProfile { get; set; } = null!;
    public BatchEnrollment? BatchEnrollment { get; set; }
}
