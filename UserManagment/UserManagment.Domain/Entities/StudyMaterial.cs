namespace UserManagment.Domain.Entities;

public class StudyMaterial
{
    public Guid Id { get; set; }
    public Guid TutorProfileId { get; set; }
    public Guid? TutorBatchId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Topic { get; set; }
    public string? Module { get; set; }
    public string? Chapter { get; set; }
    public string? TagsCsv { get; set; }
    public string FileUrlsCsv { get; set; } = string.Empty;
    public bool IsDeleted { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public virtual TutorProfile TutorProfile { get; set; } = null!;
    public virtual TutorBatch? TutorBatch { get; set; }
}
