using UserManagment.Application.Contracts;
using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Helpers;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Constants;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Services;

public class BatchEnrollmentService : IBatchEnrollmentService
{
    private readonly IBatchEnrollmentRepository _enrollmentRepository;
    private readonly ITutorBatchRepository _batchRepository;
    private readonly ITutorProfileRepository _tutorProfileRepository;
    private readonly IStudentProfileRepository _studentProfileRepository;
    private readonly ICourseAssignmentRepository _assignmentRepository;
    private readonly INotificationService _notificationService;
    private readonly IEnrollmentBillingService _billingService;
    private readonly IEnrollmentCompletionService _completionService;
    private readonly IUnitOfWork _unitOfWork;

    public BatchEnrollmentService(
        IBatchEnrollmentRepository enrollmentRepository,
        ITutorBatchRepository batchRepository,
        ITutorProfileRepository tutorProfileRepository,
        IStudentProfileRepository studentProfileRepository,
        ICourseAssignmentRepository assignmentRepository,
        INotificationService notificationService,
        IEnrollmentBillingService billingService,
        IEnrollmentCompletionService completionService,
        IUnitOfWork unitOfWork)
    {
        _enrollmentRepository = enrollmentRepository;
        _batchRepository = batchRepository;
        _tutorProfileRepository = tutorProfileRepository;
        _studentProfileRepository = studentProfileRepository;
        _assignmentRepository = assignmentRepository;
        _notificationService = notificationService;
        _billingService = billingService;
        _completionService = completionService;
        _unitOfWork = unitOfWork;
    }

    public async Task<BatchEnrollmentResponse> EnrollInBatchAsync(
        string authUserId, Guid batchId, EnrollInBatchRequest request, CancellationToken cancellationToken)
    {
        await _enrollmentRepository.ExpirePastEnrollmentsAsync(cancellationToken);

        var student = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Student profile not found. Complete onboarding first.");

        student.ProfileCompleteness = student.CalculateProfileCompleteness();
        if (student.ProfileCompleteness < StudentProfileConstants.MinCompletenessForBooking)
        {
            throw new InvalidOperationException(
                $"Your profile is {student.ProfileCompleteness}% complete. Reach at least {StudentProfileConstants.MinCompletenessForBooking}% to enroll.");
        }

        var batch = await _batchRepository.GetByIdWithSessionsAsync(batchId, cancellationToken)
            ?? throw new InvalidOperationException("Batch not found.");

        if (!batch.IsPublished || batch.IsDeleted)
        {
            throw new InvalidOperationException("This batch is not available for enrollment.");
        }

        if (batch.EndDateUtc < DateTime.UtcNow)
        {
            throw new InvalidOperationException("This batch has already ended.");
        }

        var activeCount = await _enrollmentRepository.CountActiveByBatchAsync(batchId, cancellationToken);
        if (activeCount >= batch.MaxStudents)
        {
            throw new InvalidOperationException(
                $"This batch is full ({activeCount}/{batch.MaxStudents} seats). Choose another batch or ask the tutor to open a new section.");
        }

        var eligibility = await EnrollmentValidationHelper.ValidateNewEnrollmentAsync(
            _enrollmentRepository, student.Id, batch, null, cancellationToken);
        if (!eligibility.CanEnroll)
        {
            throw new InvalidOperationException(eligibility.Message ?? "Enrollment is not allowed for this package.");
        }

        var batchTutor = await _tutorProfileRepository.GetByIdAsync(batch.TutorProfileId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor not found.");
        DualRoleValidationHelper.EnsureNotSelfEnrollment(student, batchTutor);

        var enrollment = new BatchEnrollment
        {
            Id = Guid.NewGuid(),
            TutorBatchId = batch.Id,
            StudentProfileId = student.Id,
            TutorProfileId = batch.TutorProfileId,
            Subject = batch.Subject,
            StartDateUtc = batch.StartDateUtc,
            EndDateUtc = batch.EndDateUtc,
            Status = BatchEnrollmentStatus.Active,
            AmountPaid = batch.PackageFee,
            StudentNotes = request.StudentNotes?.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow,
        };

        await _enrollmentRepository.AddAsync(enrollment, cancellationToken);

        if (batch.SessionMode == BatchSessionMode.Online)
        {
            MeetingLinkProvisioner.EnsureSessionMeetingLinks(batch, batch.ClassSessions);
            await _batchRepository.UpdateAsync(batch, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var tutor = await _tutorProfileRepository.GetByIdAsync(batch.TutorProfileId, cancellationToken);
        if (tutor?.UserAccount != null)
        {
            await _notificationService.CreateAsync(
                tutor.UserAccount.AuthUserId,
                NotificationType.BookingRequested,
                "New batch enrollment",
                $"{student.UserAccount?.FullName ?? "A student"} enrolled in {batch.Title} ({batch.Subject}).",
                enrollment.Id,
                cancellationToken,
                new NotificationDeliveryMetadata
                {
                    ActionPath = "/tutor/teaching",
                });
        }

        enrollment.TutorBatch = batch;
        enrollment.StudentProfile = student;
        enrollment.TutorProfile = tutor!;
        return MapEnrollment(enrollment, batch.ClassSessions.Count(s => s.SessionDateUtc >= DateTime.UtcNow));
    }

    public async Task<BatchEnrollmentResponse> EnrollInPackageAsync(
        string authUserId, CreatePackageEnrollmentRequest request, CancellationToken cancellationToken)
    {
        var start = ToUtcDate(request.StartDateUtc);
        var end = start.AddMonths(Math.Max(1, request.PlanMonths));

        var student = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Student profile not found. Complete onboarding first.");

        var tutor = await _tutorProfileRepository.GetByIdAsync(request.TutorProfileId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor not found.");

        DualRoleValidationHelper.EnsureNotSelfEnrollment(student, tutor);

        if (!TimeOnly.TryParse(request.StartTime, out var previewStart) || !TimeOnly.TryParse(request.EndTime, out var previewEnd))
        {
            throw new InvalidOperationException("Invalid class start or end time. Use a format like 17:00 and 18:00.");
        }

        var previewBatch = new TutorBatch
        {
            TutorProfileId = tutor.Id,
            Subject = request.Subject.Trim(),
            StartDateUtc = start,
            EndDateUtc = end,
            DaysOfWeekCsv = string.IsNullOrWhiteSpace(request.DaysOfWeekCsv) ? "Monday,Wednesday,Friday" : request.DaysOfWeekCsv,
            StartTime = previewStart,
            EndTime = previewEnd,
        };

        var eligibility = await EnrollmentValidationHelper.ValidateNewEnrollmentAsync(
            _enrollmentRepository, student.Id, previewBatch, null, cancellationToken);
        if (!eligibility.CanEnroll)
        {
            throw new InvalidOperationException(eligibility.Message ?? "Enrollment is not allowed for this package.");
        }

        var createBatch = new CreateTutorBatchRequest
        {
            Title = $"{request.Subject.Trim()} — {start:MMM yyyy} package",
            Subject = request.Subject.Trim(),
            StartDateUtc = start,
            EndDateUtc = end,
            DaysOfWeekCsv = string.IsNullOrWhiteSpace(request.DaysOfWeekCsv) ? "Monday,Wednesday,Friday" : request.DaysOfWeekCsv,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            PackageFee = (tutor.MonthlyFee ?? 0) > 0
                ? (tutor.MonthlyFee ?? 0) * request.PlanMonths
                : tutor.HourlyFee * 4 * request.PlanMonths,
            MaxStudents = 1,
            SessionMode = request.SessionMode,
        };

        var batch = await CreateAdHocBatchForPackageAsync(tutor, createBatch, cancellationToken);
        return await EnrollInBatchAsync(authUserId, batch.Id, new EnrollInBatchRequest { StudentNotes = request.StudentNotes }, cancellationToken);
    }

    private async Task<TutorBatch> CreateAdHocBatchForPackageAsync(
        TutorProfile tutor, CreateTutorBatchRequest request, CancellationToken cancellationToken)
    {
        if (!TimeOnly.TryParse(request.StartTime, out var startTime) || !TimeOnly.TryParse(request.EndTime, out var endTime))
        {
            throw new InvalidOperationException("Invalid time.");
        }

        var batch = new TutorBatch
        {
            Id = Guid.NewGuid(),
            TutorProfileId = tutor.Id,
            Title = request.Title,
            Subject = request.Subject,
            StartDateUtc = ToUtcDate(request.StartDateUtc),
            EndDateUtc = ToUtcDate(request.EndDateUtc),
            DaysOfWeekCsv = request.DaysOfWeekCsv,
            StartTime = startTime,
            EndTime = endTime,
            PackageFee = request.PackageFee,
            MaxStudents = 1,
            SessionMode = request.SessionMode.Contains("person", StringComparison.OrdinalIgnoreCase)
                ? BatchSessionMode.InPerson : BatchSessionMode.Online,
            IsPublished = false,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow,
        };

        var sessions = ClassSessionGenerator.GenerateForBatch(batch);
        await _batchRepository.AddAsync(batch, cancellationToken);
        if (sessions.Count > 0)
        {
            await _batchRepository.AddSessionsAsync(sessions, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return batch;
    }

    public async Task<IReadOnlyCollection<BatchEnrollmentResponse>> GetMyEnrollmentsAsync(string authUserId, CancellationToken cancellationToken)
    {
        await _enrollmentRepository.ExpirePastEnrollmentsAsync(cancellationToken);
        await _completionService.TryAutoCompletePastEnrollmentsAsync(cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var student = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Student profile not found.");

        var enrollments = await _enrollmentRepository.GetByStudentAsync(student.Id, cancellationToken);
        return enrollments.Select(e => MapEnrollment(e, 0)).ToArray();
    }

    public async Task<IReadOnlyCollection<BatchEnrollmentResponse>> GetTutorEnrollmentsAsync(
        string authUserId, Guid? batchId, CancellationToken cancellationToken)
    {
        var tutor = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor profile not found.");

        var enrollments = batchId.HasValue
            ? await _enrollmentRepository.GetByBatchAsync(batchId.Value, cancellationToken)
            : await _enrollmentRepository.GetByTutorAsync(tutor.Id, cancellationToken);

        return enrollments.Select(e => MapEnrollment(e, 0)).ToArray();
    }

    public async Task CancelEnrollmentAsync(
        string authUserId, Guid enrollmentId, string? reason, string activeRole, CancellationToken cancellationToken)
    {
        var enrollment = await _enrollmentRepository.GetByIdAsync(enrollmentId, cancellationToken)
            ?? throw new InvalidOperationException("Enrollment not found.");

        var student = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
        var tutor = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);

        if (string.Equals(activeRole, "STUDENT", StringComparison.OrdinalIgnoreCase))
        {
            ActiveRoleAccessHelper.EnsureStudentMode(activeRole);
            if (student?.Id != enrollment.StudentProfileId)
            {
                throw new UnauthorizedAccessException("Not authorized to cancel this enrollment as a student.");
            }
        }
        else if (string.Equals(activeRole, "TUTOR", StringComparison.OrdinalIgnoreCase))
        {
            ActiveRoleAccessHelper.EnsureTutorMode(activeRole);
            if (tutor?.Id != enrollment.TutorProfileId)
            {
                throw new UnauthorizedAccessException("Not authorized to cancel this enrollment as a tutor.");
            }
        }
        else
        {
            throw new UnauthorizedAccessException("Invalid active role for this operation.");
        }

        enrollment.Status = BatchEnrollmentStatus.Cancelled;
        enrollment.CancellationReason = reason?.Trim();
        enrollment.CancelledAtUtc = DateTime.UtcNow;
        enrollment.UpdatedAtUtc = DateTime.UtcNow;
        await _enrollmentRepository.UpdateAsync(enrollment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<EnrollmentEligibilityResponse> CanEnrollAsync(
        Guid studentProfileId,
        Guid tutorProfileId,
        string subject,
        DateTime start,
        DateTime end,
        string daysOfWeekCsv,
        string startTime,
        string endTime,
        CancellationToken cancellationToken)
    {
        if (!TimeOnly.TryParse(startTime, out var batchStart) || !TimeOnly.TryParse(endTime, out var batchEnd))
        {
            return EnrollmentEligibilityResponse.Blocked(
                "Invalid class time. Provide start and end times such as 17:00 and 18:00.");
        }

        var proposed = new TutorBatch
        {
            TutorProfileId = tutorProfileId,
            Subject = subject.Trim(),
            StartDateUtc = ToUtcDate(start),
            EndDateUtc = ToUtcDate(end),
            DaysOfWeekCsv = string.IsNullOrWhiteSpace(daysOfWeekCsv) ? "Monday,Wednesday,Friday" : daysOfWeekCsv,
            StartTime = batchStart,
            EndTime = batchEnd,
        };

        return await EnrollmentValidationHelper.ValidateNewEnrollmentAsync(
            _enrollmentRepository, studentProfileId, proposed, null, cancellationToken);
    }

    public async Task<EnrollmentEligibilityResponse> CanEnrollInBatchAsync(
        Guid studentProfileId, Guid batchId, CancellationToken cancellationToken)
    {
        await _enrollmentRepository.ExpirePastEnrollmentsAsync(cancellationToken);

        var batch = await _batchRepository.GetByIdWithSessionsAsync(batchId, cancellationToken);
        if (batch is null || batch.IsDeleted)
        {
            return EnrollmentEligibilityResponse.Blocked("This course batch is no longer available.");
        }

        if (!batch.IsPublished || batch.LifecycleStatus != BatchLifecycleStatus.Active)
        {
            return EnrollmentEligibilityResponse.Blocked("This batch is not open for enrollment yet.");
        }

        if (batch.EndDateUtc < DateTime.UtcNow)
        {
            return EnrollmentEligibilityResponse.Blocked("This course batch has already ended.");
        }

        var activeCount = await _enrollmentRepository.CountActiveByBatchAsync(batchId, cancellationToken);
        if (activeCount >= batch.MaxStudents)
        {
            return EnrollmentEligibilityResponse.Blocked(
                $"This batch is full ({batch.MaxStudents} students). Choose another batch or contact the tutor.");
        }

        return await EnrollmentValidationHelper.ValidateNewEnrollmentAsync(
            _enrollmentRepository, studentProfileId, batch, null, cancellationToken);
    }

    public async Task<EnrolledStudentDetailResponse> GetEnrolledStudentDetailAsync(
        string authUserId, Guid studentProfileId, Guid? batchId, CancellationToken cancellationToken)
    {
        var tutor = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor profile not found.");

        var enrollments = await _enrollmentRepository.GetByTutorAsync(tutor.Id, cancellationToken);
        var studentEnrollments = enrollments
            .Where(e => e.StudentProfileId == studentProfileId &&
                        (!batchId.HasValue || e.TutorBatchId == batchId))
            .ToList();

        if (studentEnrollments.Count == 0)
        {
            throw new InvalidOperationException("Student is not enrolled with you.");
        }

        var student = studentEnrollments[0].StudentProfile
            ?? throw new InvalidOperationException("Student profile not found.");

        var batchIds = studentEnrollments.Select(e => e.TutorBatchId).ToHashSet();
        var assignments = (await _assignmentRepository.GetByTutorAsync(tutor.Id, cancellationToken))
            .Where(a => a.TutorBatchId == null || batchIds.Contains(a.TutorBatchId.Value))
            .ToList();

        var assignmentIds = assignments.Select(a => a.Id).ToList();
        var subs = await _assignmentRepository.GetStudentSubmissionsByAssignmentIdsAsync(
            studentProfileId, assignmentIds, cancellationToken);

        var graded = subs.Values.Where(s => s.Status == SubmissionStatus.Graded).ToList();
        var avgGrade = graded.Count > 0
            ? graded.Average(s => (double)(s.Percentage ?? 0))
            : 0;

        var completedCount = subs.Values.Count(s =>
            s.Status is SubmissionStatus.Submitted or SubmissionStatus.Graded or SubmissionStatus.Returned);
        var completionRate = assignments.Count > 0
            ? Math.Round(completedCount * 100m / assignments.Count, 1)
            : 0;

        var pendingAssignments = assignments
            .Where(a => a.Status == AssignmentWorkflowStatus.Published &&
                        !subs.ContainsKey(a.Id))
            .Select(a => new CourseAssignmentResponse
            {
                Id = a.Id,
                Title = a.Title,
                Subject = a.Subject,
                DueDateUtc = a.DueDateUtc,
                TotalMarks = a.TotalMarks,
                Status = a.Status.ToString(),
                IsOverdue = a.DueDateUtc < DateTime.UtcNow,
            })
            .ToArray();

        var recentSubmissions = subs.Values
            .OrderByDescending(s => s.SubmittedAtUtc ?? s.CreatedAtUtc)
            .Take(5)
            .Select(s => new AssignmentSubmissionResponse
            {
                Id = s.Id,
                CourseAssignmentId = s.CourseAssignmentId,
                AssignmentTitle = assignments.FirstOrDefault(a => a.Id == s.CourseAssignmentId)?.Title ?? string.Empty,
                StudentProfileId = s.StudentProfileId,
                StudentName = student.UserAccount?.FullName ?? string.Empty,
                Status = s.Status.ToString(),
                MarksObtained = s.MarksObtained,
                GradeLetter = s.GradeLetter,
                Percentage = s.Percentage,
                SubmittedAtUtc = s.SubmittedAtUtc,
            })
            .ToArray();

        return new EnrolledStudentDetailResponse
        {
            StudentProfileId = studentProfileId,
            StudentName = student.UserAccount?.FullName ?? "Student",
            Email = student.UserAccount?.Email,
            GradeLevel = student.CurrentGradeOrYear,
            EnrolledSubjects = studentEnrollments.Select(e => e.Subject).Distinct().ToArray(),
            AttendanceRate = 0,
            AssignmentCompletionRate = completionRate,
            AverageGrade = (decimal)avgGrade,
            ProgressPercentage = completionRate,
            JoinedDateUtc = studentEnrollments.Min(e => e.CreatedAtUtc),
            RecentSubmissions = recentSubmissions,
            PendingAssignments = pendingAssignments,
            TutorNotes = studentEnrollments.FirstOrDefault()?.StudentNotes,
        };
    }

    private static BatchEnrollmentResponse MapEnrollment(BatchEnrollment e, int upcomingSessions)
    {
        var batch = e.TutorBatch;
        var isOnline = batch?.SessionMode == Domain.Enums.BatchSessionMode.Online;
        var days = batch is not null ? BatchScheduleHelper.FormatDays(batch.DaysOfWeekCsv) : string.Empty;
        var times = batch is not null ? BatchScheduleHelper.FormatTimeRange(batch.StartTime, batch.EndTime) : string.Empty;
        var hasAccess = e.Status is BatchEnrollmentStatus.Active or BatchEnrollmentStatus.Pending;

        return new BatchEnrollmentResponse
        {
            Id = e.Id,
            TutorBatchId = e.TutorBatchId,
            StudentProfileId = e.StudentProfileId,
            TutorProfileId = e.TutorProfileId,
            Subject = e.Subject,
            BatchTitle = batch?.Title ?? string.Empty,
            TutorName = e.TutorProfile?.UserAccount?.FullName ?? string.Empty,
            StudentName = e.StudentProfile?.UserAccount?.FullName ?? string.Empty,
            StartDateUtc = e.StartDateUtc,
            EndDateUtc = e.EndDateUtc,
            Status = e.Status.ToString(),
            AmountPaid = e.AmountPaid,
            PlanMonths = batch is not null ? ComputePlanMonths(e.StartDateUtc, e.EndDateUtc) : 1,
            MonthlyFeeAmount = e.MonthlyFeeAmount,
            CompletionDateUtc = e.CompletionDateUtc,
            EffectiveEndDateUtc = e.EffectiveEndDateUtc,
            WithdrawalRequestedAtUtc = e.WithdrawalRequestedAtUtc,
            WithdrawalReason = e.WithdrawalReason,
            UpcomingSessionCount = upcomingSessions,
            DaysOfWeekCsv = batch?.DaysOfWeekCsv ?? string.Empty,
            StartTime = batch?.StartTime.ToString("HH:mm") ?? string.Empty,
            EndTime = batch?.EndTime.ToString("HH:mm") ?? string.Empty,
            ScheduleLabel = batch is not null ? $"{days} · {times}" : string.Empty,
            SessionMode = isOnline == true ? "Online" : batch is not null ? "InPerson" : string.Empty,
            LocationOrMeetingInfo = hasAccess
                ? (isOnline == true
                    ? batch?.OnlineMeetingInstructions
                    : string.Join(" · ", new[] { batch?.InPersonAddress, batch?.InPersonBuildingDetails, batch?.LocationNotes }.Where(x => !string.IsNullOrWhiteSpace(x))))
                : null,
        };
    }

    private static DateTime ToUtcDate(DateTime d) =>
        DateTime.SpecifyKind(new DateTime(d.Year, d.Month, d.Day, 0, 0, 0), DateTimeKind.Utc);

    private static int ComputePlanMonths(DateTime start, DateTime end)
    {
        var months = (end.Year - start.Year) * 12 + end.Month - start.Month;
        if (end.Day >= start.Day) months += 1;
        return Math.Max(1, months);
    }
}
