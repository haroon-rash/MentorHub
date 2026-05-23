using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Helpers;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;
namespace UserManagment.Application.Services;

public class EnrollmentBillingService : IEnrollmentBillingService
{
    private const int GraceDays = 5;
    private readonly IBatchEnrollmentRepository _enrollmentRepository;
    private readonly IEnrollmentBillingPeriodRepository _billingRepository;
    private readonly IStudentProfileRepository _studentProfileRepository;
    private readonly ITutorProfileRepository _tutorProfileRepository;
    private readonly ITutorBatchRepository _batchRepository;
    private readonly IUnitOfWork _unitOfWork;

    public EnrollmentBillingService(
        IBatchEnrollmentRepository enrollmentRepository,
        IEnrollmentBillingPeriodRepository billingRepository,
        IStudentProfileRepository studentProfileRepository,
        ITutorProfileRepository tutorProfileRepository,
        ITutorBatchRepository batchRepository,
        IUnitOfWork unitOfWork)
    {
        _enrollmentRepository = enrollmentRepository;
        _billingRepository = billingRepository;
        _studentProfileRepository = studentProfileRepository;
        _tutorProfileRepository = tutorProfileRepository;
        _batchRepository = batchRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task GenerateBillingPeriodsAsync(BatchEnrollment enrollment, CancellationToken cancellationToken)
    {
        var existing = await _billingRepository.GetByEnrollmentAsync(enrollment.Id, cancellationToken);
        if (existing.Count > 0) return;

        var planMonths = Math.Max(1, enrollment.PlanMonths);
        var monthlyFee = enrollment.MonthlyFeeAmount > 0
            ? enrollment.MonthlyFeeAmount
            : Math.Round(enrollment.AmountPaid / planMonths, 2);

        var now = DateTime.UtcNow;
        var periods = BuildPeriods(enrollment.Id, enrollment.StartDateUtc, planMonths, monthlyFee, now);
        await _billingRepository.AddRangeAsync(periods, cancellationToken);
    }

    public async Task<IReadOnlyCollection<BillingPeriodResponse>> GetBillingPeriodsAsync(
        string authUserId, Guid enrollmentId, string activeRole, CancellationToken cancellationToken)
    {
        var enrollment = await RequireEnrollmentAccessForActiveRoleAsync(
            authUserId, enrollmentId, activeRole, cancellationToken);
        var periods = await _billingRepository.GetByEnrollmentAsync(enrollment.Id, cancellationToken);
        return periods.Select(MapPeriod).ToArray();
    }

    public async Task<WithdrawalPreviewResponse> PreviewWithdrawalAsync(
        string authUserId, Guid enrollmentId, DateTime requestedLeaveDateUtc, string activeRole, CancellationToken cancellationToken)
    {
        ActiveRoleAccessHelper.EnsureStudentMode(activeRole);
        var enrollment = await RequireStudentEnrollmentAsync(authUserId, enrollmentId, cancellationToken);
        var leaveDate = ToUtcDate(requestedLeaveDateUtc);
        return await BuildWithdrawalPreviewAsync(enrollment, leaveDate, apply: false, cancellationToken);
    }

    public async Task<WithdrawalPreviewResponse> ConfirmWithdrawalAsync(
        string authUserId, Guid enrollmentId, WithdrawEnrollmentRequest request, string activeRole, CancellationToken cancellationToken)
    {
        ActiveRoleAccessHelper.EnsureStudentMode(activeRole);
        var enrollment = await RequireStudentEnrollmentAsync(authUserId, enrollmentId, cancellationToken);
        if (enrollment.Status is not BatchEnrollmentStatus.Active and not BatchEnrollmentStatus.Pending)
        {
            throw new InvalidOperationException("Only active enrollments can request early leave.");
        }

        var notes = request.Reason?.Trim();
        if (string.IsNullOrWhiteSpace(notes) || notes.Length < 10)
        {
            throw new InvalidOperationException("Withdrawal notes are required (at least 10 characters).");
        }

        var leaveDate = ToUtcDate(request.RequestedLeaveDateUtc);
        var preview = await BuildWithdrawalPreviewAsync(enrollment, leaveDate, apply: true, cancellationToken);

        var now = DateTime.UtcNow;
        enrollment.Status = BatchEnrollmentStatus.Withdrawn;
        enrollment.WithdrawalRequestedAtUtc = now;
        enrollment.CompletionDateUtc = now;
        enrollment.EffectiveEndDateUtc = preview.EffectiveEndDateUtc;
        enrollment.WithdrawalReason = notes;
        enrollment.UpdatedAtUtc = now;

        await CancelFutureSessionsAsync(enrollment, preview.EffectiveEndDateUtc, cancellationToken);
        await _enrollmentRepository.UpdateAsync(enrollment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return preview;
    }

    private async Task<WithdrawalPreviewResponse> BuildWithdrawalPreviewAsync(
        BatchEnrollment enrollment, DateTime leaveDate, bool apply, CancellationToken cancellationToken)
    {
        var periods = (await _billingRepository.GetByEnrollmentAsync(enrollment.Id, cancellationToken)).ToList();
        if (periods.Count == 0)
        {
            await GenerateBillingPeriodsAsync(enrollment, cancellationToken);
            if (apply) await _unitOfWork.SaveChangesAsync(cancellationToken);
            periods = (await _billingRepository.GetByEnrollmentAsync(enrollment.Id, cancellationToken)).ToList();
        }

        var effectiveEnd = leaveDate > enrollment.EndDateUtc ? enrollment.EndDateUtc : leaveDate;
        var owed = new List<EnrollmentBillingPeriod>();
        var waived = new List<EnrollmentBillingPeriod>();
        var skipped = new List<EnrollmentBillingPeriod>();

        foreach (var period in periods)
        {
            if (leaveDate < period.PeriodStartUtc.Date)
            {
                if (period.Status is EnrollmentBillingPeriodStatus.Pending)
                {
                    period.Status = EnrollmentBillingPeriodStatus.Skipped;
                    skipped.Add(period);
                }
                continue;
            }

            if (period.Status is EnrollmentBillingPeriodStatus.Paid or EnrollmentBillingPeriodStatus.Waived or EnrollmentBillingPeriodStatus.Skipped)
            {
                continue;
            }

            if (leaveDate <= period.GraceEndsUtc.Date)
            {
                period.Status = EnrollmentBillingPeriodStatus.Waived;
                waived.Add(period);
            }
            else if (leaveDate >= period.PeriodStartUtc.Date)
            {
                period.Status = EnrollmentBillingPeriodStatus.Owed;
                owed.Add(period);
            }
        }

        if (apply)
        {
            await _billingRepository.UpdateRangeAsync(periods, cancellationToken);
        }

        return new WithdrawalPreviewResponse
        {
            RequestedLeaveDateUtc = leaveDate,
            EffectiveEndDateUtc = effectiveEnd,
            TotalOwed = owed.Sum(p => p.FeeAmount),
            PeriodsOwed = owed.Select(MapPeriod).ToArray(),
            PeriodsWaived = waived.Select(MapPeriod).ToArray(),
            PeriodsSkipped = skipped.Select(MapPeriod).ToArray(),
        };
    }

    private Task CancelFutureSessionsAsync(
        BatchEnrollment enrollment, DateTime effectiveEnd, CancellationToken cancellationToken) =>
        _batchRepository.CancelSessionsAfterDateAsync(enrollment.TutorBatchId, effectiveEnd, cancellationToken);

    private async Task<BatchEnrollment> RequireStudentEnrollmentAsync(
        string authUserId, Guid enrollmentId, CancellationToken cancellationToken)
    {
        var student = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Student profile not found.");
        var enrollment = await _enrollmentRepository.GetByIdAsync(enrollmentId, cancellationToken)
            ?? throw new InvalidOperationException("Enrollment not found.");
        if (enrollment.StudentProfileId != student.Id)
        {
            throw new UnauthorizedAccessException("This enrollment does not belong to you.");
        }
        return enrollment;
    }

    private async Task<BatchEnrollment> RequireEnrollmentAccessForActiveRoleAsync(
        string authUserId, Guid enrollmentId, string activeRole, CancellationToken cancellationToken)
    {
        var enrollment = await _enrollmentRepository.GetByIdAsync(enrollmentId, cancellationToken)
            ?? throw new InvalidOperationException("Enrollment not found.");

        if (string.Equals(activeRole, "STUDENT", StringComparison.OrdinalIgnoreCase))
        {
            var student = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
            if (student?.Id == enrollment.StudentProfileId)
            {
                return enrollment;
            }
        }
        else if (string.Equals(activeRole, "TUTOR", StringComparison.OrdinalIgnoreCase))
        {
            var tutor = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
            if (tutor?.Id == enrollment.TutorProfileId)
            {
                return enrollment;
            }
        }

        throw new UnauthorizedAccessException("Not authorized to view this enrollment in the current profile mode.");
    }

    internal static List<EnrollmentBillingPeriod> BuildPeriods(
        Guid enrollmentId, DateTime startDateUtc, int planMonths, decimal monthlyFee, DateTime now)
    {
        var anchor = DateTime.SpecifyKind(startDateUtc.Date, DateTimeKind.Utc);
        var periods = new List<EnrollmentBillingPeriod>();

        for (var i = 0; i < planMonths; i++)
        {
            var periodStart = AddMonthsPreserveDay(anchor, i);
            var nextStart = AddMonthsPreserveDay(anchor, i + 1);
            var periodEnd = nextStart.AddTicks(-1);
            periods.Add(new EnrollmentBillingPeriod
            {
                Id = Guid.NewGuid(),
                BatchEnrollmentId = enrollmentId,
                PeriodIndex = i + 1,
                PeriodStartUtc = periodStart,
                PeriodEndUtc = periodEnd,
                GraceEndsUtc = periodStart.AddDays(GraceDays),
                FeeAmount = monthlyFee,
                Status = i == 0 ? EnrollmentBillingPeriodStatus.Paid : EnrollmentBillingPeriodStatus.Pending,
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
            });
        }

        return periods;
    }

    internal static DateTime AddMonthsPreserveDay(DateTime anchor, int months)
    {
        var target = anchor.AddMonths(months);
        var daysInMonth = DateTime.DaysInMonth(target.Year, target.Month);
        var day = Math.Min(anchor.Day, daysInMonth);
        return new DateTime(target.Year, target.Month, day, 0, 0, 0, DateTimeKind.Utc);
    }

    private static BillingPeriodResponse MapPeriod(EnrollmentBillingPeriod p) => new()
    {
        Id = p.Id,
        PeriodIndex = p.PeriodIndex,
        PeriodStartUtc = p.PeriodStartUtc,
        PeriodEndUtc = p.PeriodEndUtc,
        GraceEndsUtc = p.GraceEndsUtc,
        FeeAmount = p.FeeAmount,
        Status = p.Status.ToString(),
    };

    private static DateTime ToUtcDate(DateTime d) =>
        DateTime.SpecifyKind(new DateTime(d.Year, d.Month, d.Day, 0, 0, 0), DateTimeKind.Utc);
}
