using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;

namespace UserManagment.Application.Helpers;

public static class EnrollmentValidationHelper
{
    public static async Task<EnrollmentEligibilityResponse> ValidateNewEnrollmentAsync(
        IBatchEnrollmentRepository enrollmentRepository,
        Guid studentProfileId,
        TutorBatch proposedBatch,
        Guid? excludeEnrollmentId,
        CancellationToken cancellationToken)
    {
        var subject = proposedBatch.Subject.Trim();
        var tutorProfileId = proposedBatch.TutorProfileId;

        var duplicate = await enrollmentRepository.GetActiveSameTutorSubjectEnrollmentAsync(
            studentProfileId,
            tutorProfileId,
            subject,
            proposedBatch.StartDateUtc,
            proposedBatch.EndDateUtc,
            excludeEnrollmentId,
            cancellationToken);

        if (duplicate is not null)
        {
            var tutorName = duplicate.TutorProfile?.UserAccount?.FullName ?? "this tutor";
            return EnrollmentEligibilityResponse.Blocked(
                $"You already have an active {duplicate.Subject} package with {tutorName} until {duplicate.EndDateUtc:dd MMM yyyy}. " +
                "Wait until it expires or cancel it before enrolling in the same subject with this tutor again.");
        }

        var activeEnrollments = await enrollmentRepository.GetActiveEnrollmentsWithBatchesAsync(
            studentProfileId, excludeEnrollmentId, cancellationToken);

        foreach (var existing in activeEnrollments)
        {
            var existingBatch = existing.TutorBatch;
            if (existingBatch is null)
            {
                continue;
            }

            if (!BatchScheduleHelper.RecurringSchedulesOverlap(proposedBatch, existingBatch))
            {
                continue;
            }

            var tutorName = existing.TutorProfile?.UserAccount?.FullName ?? "another tutor";
            var days = BatchScheduleHelper.FormatDays(existingBatch.DaysOfWeekCsv);
            var times = BatchScheduleHelper.FormatTimeRange(existingBatch.StartTime, existingBatch.EndTime);

            return EnrollmentEligibilityResponse.Blocked(
                $"This schedule conflicts with your {existing.Subject} classes with {tutorName} on {days} at {times} " +
                $"(active until {existing.EndDateUtc:dd MMM yyyy}). " +
                "Choose a different day or time that does not overlap your existing courses.");
        }

        return EnrollmentEligibilityResponse.Allowed();
    }

    public static EnrollmentEligibilityResponse ValidateSingleSessionAgainstEnrollments(
        IReadOnlyCollection<BatchEnrollment> activeEnrollments,
        DateTime bookingDateUtc,
        string timeSlot)
    {
        foreach (var existing in activeEnrollments)
        {
            var batch = existing.TutorBatch;
            if (batch is null)
            {
                continue;
            }

            if (!BatchScheduleHelper.ConflictsWithSingleSession(batch, bookingDateUtc, timeSlot))
            {
                continue;
            }

            var tutorName = existing.TutorProfile?.UserAccount?.FullName ?? "another tutor";
            var times = BatchScheduleHelper.FormatTimeRange(batch.StartTime, batch.EndTime);

            return EnrollmentEligibilityResponse.Blocked(
                $"This session ({bookingDateUtc:ddd, dd MMM} · {timeSlot}) overlaps your {existing.Subject} package with {tutorName} " +
                $"on {BatchScheduleHelper.FormatDays(batch.DaysOfWeekCsv)} at {times}. Pick a time that does not clash.");
        }

        return EnrollmentEligibilityResponse.Allowed();
    }
}
