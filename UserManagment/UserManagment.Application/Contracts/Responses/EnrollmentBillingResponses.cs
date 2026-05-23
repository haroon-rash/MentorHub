namespace UserManagment.Application.Contracts.Responses;

public class BillingPeriodResponse
{
    public Guid Id { get; set; }
    public int PeriodIndex { get; set; }
    public DateTime PeriodStartUtc { get; set; }
    public DateTime PeriodEndUtc { get; set; }
    public DateTime GraceEndsUtc { get; set; }
    public decimal FeeAmount { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class WithdrawalPreviewResponse
{
    public DateTime RequestedLeaveDateUtc { get; set; }
    public DateTime EffectiveEndDateUtc { get; set; }
    public decimal TotalOwed { get; set; }
    public IReadOnlyCollection<BillingPeriodResponse> PeriodsOwed { get; set; } = Array.Empty<BillingPeriodResponse>();
    public IReadOnlyCollection<BillingPeriodResponse> PeriodsWaived { get; set; } = Array.Empty<BillingPeriodResponse>();
    public IReadOnlyCollection<BillingPeriodResponse> PeriodsSkipped { get; set; } = Array.Empty<BillingPeriodResponse>();
}

public class ReviewEligibilityResponse
{
    public bool CanReview { get; set; }
    public string? Reason { get; set; }
    public int? DaysRemaining { get; set; }
    public Guid? ExistingReviewId { get; set; }
}
