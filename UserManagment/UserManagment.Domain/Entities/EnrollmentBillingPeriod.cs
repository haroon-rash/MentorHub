using UserManagment.Domain.Enums;

namespace UserManagment.Domain.Entities;

public class EnrollmentBillingPeriod
{
    public Guid Id { get; set; }
    public Guid BatchEnrollmentId { get; set; }
    public int PeriodIndex { get; set; }
    public DateTime PeriodStartUtc { get; set; }
    public DateTime PeriodEndUtc { get; set; }
    public DateTime GraceEndsUtc { get; set; }
    public decimal FeeAmount { get; set; }
    public EnrollmentBillingPeriodStatus Status { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public virtual BatchEnrollment BatchEnrollment { get; set; } = null!;
}
