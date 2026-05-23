using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Helpers;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Services;

public class TutorBatchService : ITutorBatchService
{
    private readonly ITutorBatchRepository _batchRepository;
    private readonly ITutorProfileRepository _tutorProfileRepository;
    private readonly IBatchEnrollmentRepository _enrollmentRepository;
    private readonly IStudentProfileRepository _studentProfileRepository;
    private readonly IUnitOfWork _unitOfWork;

    public TutorBatchService(
        ITutorBatchRepository batchRepository,
        ITutorProfileRepository tutorProfileRepository,
        IBatchEnrollmentRepository enrollmentRepository,
        IStudentProfileRepository studentProfileRepository,
        IUnitOfWork unitOfWork)
    {
        _batchRepository = batchRepository;
        _tutorProfileRepository = tutorProfileRepository;
        _enrollmentRepository = enrollmentRepository;
        _studentProfileRepository = studentProfileRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<TutorBatchResponse> CreateBatchAsync(string authUserId, CreateTutorBatchRequest request, CancellationToken cancellationToken)
    {
        var tutor = await RequireApprovedTutorAsync(authUserId, cancellationToken);
        TutorSubjectValidator.EnsureSubjectAllowed(tutor, request.Subject);
        ValidateSchedule(request);

        var batch = BuildBatchFromRequest(tutor.Id, request);
        var sessions = ClassSessionGenerator.GenerateForBatch(batch);
        await _batchRepository.AddAsync(batch, cancellationToken);
        if (sessions.Count > 0)
        {
            await _batchRepository.AddSessionsAsync(sessions, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapBatch(batch, 0, sessions.Count, includeSensitive: true);
    }

    public async Task<TutorBatchResponse> UpdateBatchAsync(string authUserId, Guid batchId, UpdateTutorBatchRequest request, CancellationToken cancellationToken)
    {
        var tutor = await RequireApprovedTutorAsync(authUserId, cancellationToken);
        var batch = await RequireOwnedBatchAsync(tutor.Id, batchId, cancellationToken);

        TutorSubjectValidator.EnsureSubjectAllowed(tutor, request.Subject);
        ValidateSchedule(request);

        var scheduleChanged = batch.StartDateUtc != ToUtcDate(request.StartDateUtc) ||
                              batch.EndDateUtc != ToUtcDate(request.EndDateUtc) ||
                              batch.DaysOfWeekCsv != request.DaysOfWeekCsv.Trim() ||
                              batch.StartTime.ToString("HH:mm") != request.StartTime ||
                              batch.EndTime.ToString("HH:mm") != request.EndTime;

        ApplyRequestToBatch(batch, request);
        batch.IsPublished = request.IsPublished;
        batch.UpdatedAtUtc = DateTime.UtcNow;

        if (scheduleChanged)
        {
            var sessions = ClassSessionGenerator.GenerateForBatch(batch);
            await _batchRepository.ReplaceSessionsAsync(batch.Id, sessions, cancellationToken);
        }

        await _batchRepository.UpdateAsync(batch, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var activeCount = await _enrollmentRepository.CountActiveByBatchAsync(batchId, cancellationToken);
        return MapBatch(batch, activeCount, batch.ClassSessions?.Count ?? 0, includeSensitive: true);
    }

    public async Task DeleteBatchAsync(string authUserId, Guid batchId, DeleteTutorBatchRequest request, CancellationToken cancellationToken)
    {
        var tutor = await RequireApprovedTutorAsync(authUserId, cancellationToken);
        var batch = await RequireOwnedBatchAsync(tutor.Id, batchId, cancellationToken);
        var activeCount = await _enrollmentRepository.CountActiveByBatchAsync(batchId, cancellationToken);

        if (activeCount > 0 && !request.Force)
        {
            if (request.ArchiveInstead)
            {
                await ArchiveBatchAsync(authUserId, batchId, cancellationToken);
                return;
            }

            throw new InvalidOperationException(
                $"Cannot delete batch with {activeCount} active enrollment(s). Archive instead or use force delete.");
        }

        batch.IsDeleted = true;
        batch.LifecycleStatus = BatchLifecycleStatus.Archived;
        batch.IsPublished = false;
        batch.UpdatedAtUtc = DateTime.UtcNow;
        await _batchRepository.UpdateAsync(batch, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<TutorBatchResponse> ArchiveBatchAsync(string authUserId, Guid batchId, CancellationToken cancellationToken)
    {
        var tutor = await RequireApprovedTutorAsync(authUserId, cancellationToken);
        var batch = await RequireOwnedBatchAsync(tutor.Id, batchId, cancellationToken);
        batch.LifecycleStatus = BatchLifecycleStatus.Archived;
        batch.IsPublished = false;
        batch.UpdatedAtUtc = DateTime.UtcNow;
        await _batchRepository.UpdateAsync(batch, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        var activeCount = await _enrollmentRepository.CountActiveByBatchAsync(batchId, cancellationToken);
        return MapBatch(batch, activeCount, batch.ClassSessions?.Count ?? 0, includeSensitive: true);
    }

    public async Task<TutorBatchResponse> DuplicateBatchAsync(string authUserId, Guid batchId, CancellationToken cancellationToken)
    {
        var tutor = await RequireApprovedTutorAsync(authUserId, cancellationToken);
        var source = await RequireOwnedBatchAsync(tutor.Id, batchId, cancellationToken);

        var duplicate = new TutorBatch
        {
            Id = Guid.NewGuid(),
            TutorProfileId = source.TutorProfileId,
            Title = $"{source.Title} (Copy)",
            Subject = source.Subject,
            Description = source.Description,
            LearningObjectives = source.LearningObjectives,
            DifficultyLevel = source.DifficultyLevel,
            StartDateUtc = source.StartDateUtc,
            EndDateUtc = source.EndDateUtc,
            DaysOfWeekCsv = source.DaysOfWeekCsv,
            StartTime = source.StartTime,
            EndTime = source.EndTime,
            PackageFee = source.PackageFee,
            MaxStudents = source.MaxStudents,
            SessionMode = source.SessionMode,
            LocationOrMeetingInfo = source.LocationOrMeetingInfo,
            InPersonAddress = source.InPersonAddress,
            InPersonBuildingDetails = source.InPersonBuildingDetails,
            LocationNotes = source.LocationNotes,
            OnlineMeetingInstructions = source.OnlineMeetingInstructions,
            Visibility = source.Visibility,
            AssignmentRules = source.AssignmentRules,
            IsPublished = false,
            LifecycleStatus = BatchLifecycleStatus.Active,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow,
        };

        var sessions = ClassSessionGenerator.GenerateForBatch(duplicate);
        await _batchRepository.AddAsync(duplicate, cancellationToken);
        if (sessions.Count > 0)
        {
            await _batchRepository.AddSessionsAsync(sessions, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapBatch(duplicate, 0, sessions.Count, includeSensitive: true);
    }

    public async Task<TutorBatchResponse> CompleteBatchAsync(string authUserId, Guid batchId, CancellationToken cancellationToken)
    {
        var tutor = await RequireApprovedTutorAsync(authUserId, cancellationToken);
        var batch = await RequireOwnedBatchAsync(tutor.Id, batchId, cancellationToken);
        batch.LifecycleStatus = BatchLifecycleStatus.Completed;
        batch.IsPublished = false;
        batch.UpdatedAtUtc = DateTime.UtcNow;
        await _batchRepository.UpdateAsync(batch, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        var activeCount = await _enrollmentRepository.CountActiveByBatchAsync(batchId, cancellationToken);
        return MapBatch(batch, activeCount, batch.ClassSessions?.Count ?? 0, includeSensitive: true);
    }

    public async Task<TutorBatchResponse> CancelBatchAsync(string authUserId, Guid batchId, CancellationToken cancellationToken)
    {
        var tutor = await RequireApprovedTutorAsync(authUserId, cancellationToken);
        var batch = await RequireOwnedBatchAsync(tutor.Id, batchId, cancellationToken);
        batch.LifecycleStatus = BatchLifecycleStatus.Cancelled;
        batch.IsPublished = false;
        batch.UpdatedAtUtc = DateTime.UtcNow;
        await _batchRepository.UpdateAsync(batch, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        var activeCount = await _enrollmentRepository.CountActiveByBatchAsync(batchId, cancellationToken);
        return MapBatch(batch, activeCount, batch.ClassSessions?.Count ?? 0, includeSensitive: true);
    }

    public async Task<IReadOnlyCollection<TutorBatchResponse>> GetTutorBatchesAsync(string authUserId, CancellationToken cancellationToken)
    {
        var tutor = await RequireApprovedTutorAsync(authUserId, cancellationToken);
        var batches = await _batchRepository.GetByTutorAsync(tutor.Id, cancellationToken);
        return batches.Select(b => MapBatch(b, CountActiveEnrollments(b), b.ClassSessions.Count, includeSensitive: true)).ToArray();
    }

    /// <summary>
    /// Batches open for student enrollment on a tutor's schedule page.
    /// Includes PUBLIC and PRIVATE batches (student is already on the tutor's booking page).
    /// </summary>
    public async Task<IReadOnlyCollection<TutorBatchResponse>> GetPublishedBatchesForTutorAsync(Guid tutorProfileId, CancellationToken cancellationToken)
    {
        var batches = await _batchRepository.GetByTutorAsync(tutorProfileId, cancellationToken);
        var now = DateTime.UtcNow;
        return batches
            .Where(b => !b.IsDeleted &&
                        b.IsPublished &&
                        b.LifecycleStatus == BatchLifecycleStatus.Active &&
                        b.EndDateUtc >= now)
            .OrderBy(b => b.StartDateUtc)
            .Select(b => MapBatch(b, CountActiveEnrollments(b), b.ClassSessions.Count, includeSensitive: false))
            .ToArray();
    }

    public async Task<TutorBatchDetailResponse> GetBatchDetailForTutorAsync(string authUserId, Guid batchId, CancellationToken cancellationToken)
    {
        var tutor = await RequireApprovedTutorAsync(authUserId, cancellationToken);
        var batch = await RequireOwnedBatchAsync(tutor.Id, batchId, cancellationToken);
        var activeCount = CountActiveEnrollments(batch);
        var mapped = MapBatch(batch, activeCount, batch.ClassSessions.Count, includeSensitive: true);
        var students = batch.Enrollments
            .OrderByDescending(e => e.CreatedAtUtc)
            .Select(e => new BatchRosterStudentResponse
            {
                EnrollmentId = e.Id,
                StudentProfileId = e.StudentProfileId,
                StudentName = e.StudentProfile?.UserAccount?.FullName ?? "Student",
                Status = e.Status.ToString(),
                EnrolledAtUtc = e.CreatedAtUtc,
                AmountPaid = e.AmountPaid,
            })
            .ToArray();

        return new TutorBatchDetailResponse
        {
            Id = mapped.Id,
            TutorProfileId = mapped.TutorProfileId,
            Title = mapped.Title,
            Subject = mapped.Subject,
            Description = mapped.Description,
            LearningObjectives = mapped.LearningObjectives,
            StartDateUtc = mapped.StartDateUtc,
            EndDateUtc = mapped.EndDateUtc,
            DaysOfWeekCsv = mapped.DaysOfWeekCsv,
            StartTime = mapped.StartTime,
            EndTime = mapped.EndTime,
            ScheduleLabel = mapped.ScheduleLabel,
            PackageFee = mapped.PackageFee,
            MaxStudents = mapped.MaxStudents,
            EnrolledCount = mapped.EnrolledCount,
            SeatsAvailable = mapped.SeatsAvailable,
            SessionMode = mapped.SessionMode,
            IsOnline = mapped.IsOnline,
            LocationOrMeetingInfo = mapped.LocationOrMeetingInfo,
            InPersonAddress = mapped.InPersonAddress,
            InPersonBuildingDetails = mapped.InPersonBuildingDetails,
            LocationNotes = mapped.LocationNotes,
            OnlineMeetingInstructions = mapped.OnlineMeetingInstructions,
            Visibility = mapped.Visibility,
            AssignmentRules = mapped.AssignmentRules,
            LifecycleStatus = mapped.LifecycleStatus,
            IsPublished = mapped.IsPublished,
            SessionCount = mapped.SessionCount,
            IsFull = mapped.IsFull,
            HasMeetingAccess = true,
            Students = students,
        };
    }

    public async Task<IReadOnlyCollection<GeneratedClassSessionResponse>> GetBatchSessionsAsync(
        string authUserId, Guid batchId, CancellationToken cancellationToken)
    {
        var batch = await _batchRepository.GetByIdWithSessionsAsync(batchId, cancellationToken)
            ?? throw new InvalidOperationException("Batch not found.");

        var tutor = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
        var student = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);

        var isTutorOwner = tutor?.Id == batch.TutorProfileId;
        var isEnrolled = student != null && batch.Enrollments.Any(e =>
            e.StudentProfileId == student.Id &&
            (e.Status == BatchEnrollmentStatus.Active || e.Status == BatchEnrollmentStatus.Pending));

        if (!isTutorOwner && !isEnrolled)
        {
            throw new InvalidOperationException("Meeting access is restricted to enrolled students.");
        }

        return batch.ClassSessions
            .OrderBy(s => s.SessionDateUtc)
            .Select(s => new GeneratedClassSessionResponse
            {
                Id = s.Id,
                TutorBatchId = s.TutorBatchId,
                Subject = batch.Subject,
                SessionDateUtc = s.SessionDateUtc,
                TimeSlotLabel = s.TimeSlotLabel,
                Status = s.Status.ToString(),
                MeetingLink = isEnrolled || isTutorOwner ? s.MeetingLink : null,
                Location = batch.SessionMode == BatchSessionMode.InPerson
                    ? (isEnrolled || isTutorOwner ? s.Location ?? batch.InPersonAddress : null)
                    : null,
            })
            .ToArray();
    }

    private async Task<TutorProfile> RequireApprovedTutorAsync(string authUserId, CancellationToken cancellationToken)
    {
        var tutor = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor profile not found.");

        if (tutor.VerificationStatus != TutorVerificationStatus.Approved)
        {
            throw new InvalidOperationException("Only approved tutors can manage batches.");
        }

        return tutor;
    }

    private async Task<TutorBatch> RequireOwnedBatchAsync(Guid tutorId, Guid batchId, CancellationToken cancellationToken)
    {
        var batch = await _batchRepository.GetByIdWithSessionsAsync(batchId, cancellationToken)
            ?? throw new InvalidOperationException("Batch not found.");

        if (batch.TutorProfileId != tutorId)
        {
            throw new InvalidOperationException("You can only manage batches that you created.");
        }

        return batch;
    }

    private static void ValidateSchedule(CreateTutorBatchRequest request)
    {
        var start = ToUtcDate(request.StartDateUtc);
        var end = ToUtcDate(request.EndDateUtc);
        if (end <= start)
        {
            throw new InvalidOperationException("End date must be after start date.");
        }

        if (!TimeOnly.TryParse(request.StartTime, out var startTime) || !TimeOnly.TryParse(request.EndTime, out var endTime))
        {
            throw new InvalidOperationException("Invalid start or end time.");
        }

        if (endTime <= startTime)
        {
            throw new InvalidOperationException("End time must be after start time.");
        }
    }

    private static TutorBatch BuildBatchFromRequest(Guid tutorId, CreateTutorBatchRequest request)
    {
        TimeOnly.TryParse(request.StartTime, out var startTime);
        TimeOnly.TryParse(request.EndTime, out var endTime);
        var mode = ParseMode(request.SessionMode);

        return new TutorBatch
        {
            Id = Guid.NewGuid(),
            TutorProfileId = tutorId,
            Title = request.Title.Trim(),
            Subject = request.Subject.Trim(),
            Description = request.Description?.Trim(),
            LearningObjectives = request.LearningObjectives?.Trim(),
            DifficultyLevel = request.DifficultyLevel?.Trim(),
            StartDateUtc = ToUtcDate(request.StartDateUtc),
            EndDateUtc = ToUtcDate(request.EndDateUtc),
            DaysOfWeekCsv = request.DaysOfWeekCsv.Trim(),
            StartTime = startTime,
            EndTime = endTime,
            PackageFee = request.PackageFee,
            MaxStudents = Math.Max(1, request.MaxStudents),
            SessionMode = mode,
            LocationOrMeetingInfo = SanitizeMeetingInfo(request.LocationOrMeetingInfo, mode),
            InPersonAddress = mode == BatchSessionMode.InPerson ? request.InPersonAddress?.Trim() : null,
            InPersonBuildingDetails = mode == BatchSessionMode.InPerson ? request.InPersonBuildingDetails?.Trim() : null,
            LocationNotes = request.LocationNotes?.Trim(),
            OnlineMeetingInstructions = mode == BatchSessionMode.Online ? request.OnlineMeetingInstructions?.Trim() : null,
            Visibility = string.IsNullOrWhiteSpace(request.Visibility) ? "PUBLIC" : request.Visibility.Trim().ToUpperInvariant(),
            AssignmentRules = request.AssignmentRules?.Trim(),
            IsPublished = true,
            LifecycleStatus = BatchLifecycleStatus.Active,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow,
        };
    }

    private static void ApplyRequestToBatch(TutorBatch batch, CreateTutorBatchRequest request)
    {
        TimeOnly.TryParse(request.StartTime, out var startTime);
        TimeOnly.TryParse(request.EndTime, out var endTime);
        var mode = ParseMode(request.SessionMode);

        batch.Title = request.Title.Trim();
        batch.Subject = request.Subject.Trim();
        batch.Description = request.Description?.Trim();
        batch.LearningObjectives = request.LearningObjectives?.Trim();
        batch.DifficultyLevel = request.DifficultyLevel?.Trim();
        batch.StartDateUtc = ToUtcDate(request.StartDateUtc);
        batch.EndDateUtc = ToUtcDate(request.EndDateUtc);
        batch.DaysOfWeekCsv = request.DaysOfWeekCsv.Trim();
        batch.StartTime = startTime;
        batch.EndTime = endTime;
        batch.PackageFee = request.PackageFee;
        batch.MaxStudents = Math.Max(1, request.MaxStudents);
        batch.SessionMode = mode;
        batch.LocationOrMeetingInfo = SanitizeMeetingInfo(request.LocationOrMeetingInfo, mode);
        batch.InPersonAddress = mode == BatchSessionMode.InPerson ? request.InPersonAddress?.Trim() : null;
        batch.InPersonBuildingDetails = mode == BatchSessionMode.InPerson ? request.InPersonBuildingDetails?.Trim() : null;
        batch.LocationNotes = request.LocationNotes?.Trim();
        batch.OnlineMeetingInstructions = mode == BatchSessionMode.Online ? request.OnlineMeetingInstructions?.Trim() : null;
        batch.Visibility = string.IsNullOrWhiteSpace(request.Visibility) ? "PUBLIC" : request.Visibility.Trim().ToUpperInvariant();
        batch.AssignmentRules = request.AssignmentRules?.Trim();
    }

    private static string? SanitizeMeetingInfo(string? value, BatchSessionMode mode)
    {
        if (mode != BatchSessionMode.Online || string.IsNullOrWhiteSpace(value))
        {
            return value?.Trim();
        }

        return MeetingLinkProvisioner.LooksLikeUrl(value) ? null : value.Trim();
    }

    private static int CountActiveEnrollments(TutorBatch b) =>
        b.Enrollments.Count(e => e.Status is BatchEnrollmentStatus.Active or BatchEnrollmentStatus.Pending);

    private static TutorBatchResponse MapBatch(TutorBatch b, int enrolled, int sessionCount, bool includeSensitive)
    {
        var isOnline = b.SessionMode == BatchSessionMode.Online;
        var days = BatchScheduleHelper.FormatDays(b.DaysOfWeekCsv);
        var times = BatchScheduleHelper.FormatTimeRange(b.StartTime, b.EndTime);

        return new TutorBatchResponse
        {
            Id = b.Id,
            TutorProfileId = b.TutorProfileId,
            Title = b.Title,
            Subject = b.Subject,
            Description = b.Description,
            LearningObjectives = b.LearningObjectives,
            StartDateUtc = b.StartDateUtc,
            EndDateUtc = b.EndDateUtc,
            DaysOfWeekCsv = b.DaysOfWeekCsv,
            StartTime = b.StartTime.ToString("HH:mm"),
            EndTime = b.EndTime.ToString("HH:mm"),
            ScheduleLabel = $"{days} · {times}",
            PackageFee = b.PackageFee,
            MaxStudents = b.MaxStudents,
            EnrolledCount = enrolled,
            SeatsAvailable = Math.Max(0, b.MaxStudents - enrolled),
            SessionMode = isOnline ? "Online" : "InPerson",
            IsOnline = isOnline,
            LocationOrMeetingInfo = includeSensitive
                ? (isOnline ? b.OnlineMeetingInstructions ?? b.LocationOrMeetingInfo : FormatInPersonLocation(b))
                : null,
            InPersonAddress = includeSensitive && !isOnline ? b.InPersonAddress : null,
            InPersonBuildingDetails = includeSensitive && !isOnline ? b.InPersonBuildingDetails : null,
            LocationNotes = includeSensitive ? b.LocationNotes : null,
            OnlineMeetingInstructions = includeSensitive && isOnline ? b.OnlineMeetingInstructions : null,
            Visibility = b.Visibility,
            AssignmentRules = includeSensitive ? b.AssignmentRules : null,
            LifecycleStatus = b.LifecycleStatus.ToString(),
            IsPublished = b.IsPublished,
            SessionCount = sessionCount,
            IsFull = enrolled >= b.MaxStudents,
            HasMeetingAccess = includeSensitive,
        };
    }

    private static string? FormatInPersonLocation(TutorBatch b)
    {
        var parts = new[] { b.InPersonAddress, b.InPersonBuildingDetails, b.LocationNotes, b.LocationOrMeetingInfo }
            .Where(p => !string.IsNullOrWhiteSpace(p));
        return string.Join(" · ", parts);
    }

    private static DateTime ToUtcDate(DateTime d) =>
        DateTime.SpecifyKind(new DateTime(d.Year, d.Month, d.Day, 0, 0, 0), DateTimeKind.Utc);

    private static BatchSessionMode ParseMode(string mode) =>
        mode.Contains("person", StringComparison.OrdinalIgnoreCase) ? BatchSessionMode.InPerson : BatchSessionMode.Online;
}
