using UserManagment.Domain.Enums;

namespace UserManagment.Domain.Entities;

/// <summary>
/// One student enrolled in a batch/package. Blocks duplicate active same-tutor+subject enrollments and overlapping class schedules.
/// </summary>
public class BatchEnrollment
{
    public Guid Id { get; set; }
    public Guid TutorBatchId { get; set; }
    public Guid StudentProfileId { get; set; }
    public Guid TutorProfileId { get; set; }
    public string Subject { get; set; } = string.Empty;

    public DateTime StartDateUtc { get; set; }
    public DateTime EndDateUtc { get; set; }
    public BatchEnrollmentStatus Status { get; set; }
    public decimal AmountPaid { get; set; }
    public int PlanMonths { get; set; } = 1;
    public decimal MonthlyFeeAmount { get; set; }
    public string? StudentNotes { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime? CancelledAtUtc { get; set; }
    public DateTime? WithdrawalRequestedAtUtc { get; set; }
    public DateTime? EffectiveEndDateUtc { get; set; }
    public string? WithdrawalReason { get; set; }
    public DateTime? CompletionDateUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public virtual TutorBatch TutorBatch { get; set; } = null!;
    public virtual ICollection<EnrollmentBillingPeriod> BillingPeriods { get; set; } = new List<EnrollmentBillingPeriod>();
    public virtual StudentProfile StudentProfile { get; set; } = null!;
    public virtual TutorProfile TutorProfile { get; set; } = null!;
}
