using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Helpers;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Services;

public class CourseAssignmentService : ICourseAssignmentService
{
    private static readonly TimeSpan EditWindow = TimeSpan.FromHours(1);

    private readonly ICourseAssignmentRepository _repository;
    private readonly ITutorProfileRepository _tutorProfileRepository;
    private readonly IStudentProfileRepository _studentProfileRepository;
    private readonly ITutorBatchRepository _batchRepository;
    private readonly IBatchEnrollmentRepository _enrollmentRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CourseAssignmentService(
        ICourseAssignmentRepository repository,
        ITutorProfileRepository tutorProfileRepository,
        IStudentProfileRepository studentProfileRepository,
        ITutorBatchRepository batchRepository,
        IBatchEnrollmentRepository enrollmentRepository,
        IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _tutorProfileRepository = tutorProfileRepository;
        _studentProfileRepository = studentProfileRepository;
        _batchRepository = batchRepository;
        _enrollmentRepository = enrollmentRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<CourseAssignmentResponse> CreateAsync(
        string authUserId, CreateCourseAssignmentRequest request, CancellationToken cancellationToken)
    {
        var tutor = await RequireTutorAsync(authUserId, cancellationToken);
        var subject = request.Subject.Trim();
        Guid? batchId = request.TutorBatchId;

        if (batchId.HasValue)
        {
            var batch = await _batchRepository.GetByIdAsync(batchId.Value, cancellationToken)
                ?? throw new InvalidOperationException("Batch not found.");
            if (batch.TutorProfileId != tutor.Id)
            {
                throw new InvalidOperationException("You can only publish assignments to your own batches.");
            }

            subject = batch.Subject;
        }
        else
        {
            TutorSubjectValidator.EnsureSubjectAllowed(tutor, subject);
        }

        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Instructions))
        {
            throw new InvalidOperationException("Title and instructions are required.");
        }

        var now = DateTime.UtcNow;
        var assignment = new CourseAssignment
        {
            Id = Guid.NewGuid(),
            TutorProfileId = tutor.Id,
            TutorBatchId = batchId,
            Subject = subject,
            Title = request.Title.Trim(),
            Instructions = request.Instructions.Trim(),
            GradingRubric = request.GradingRubric?.Trim(),
            AttachmentUrlsCsv = request.AttachmentUrlsCsv?.Trim(),
            TotalMarks = request.TotalMarks > 0 ? request.TotalMarks : 100,
            DueDateUtc = request.DueDateUtc.ToUniversalTime(),
            Status = AssignmentWorkflowStatus.Published,
            VisibilityRule = request.VisibilityRule,
            AllowResubmission = request.AllowResubmission,
            AllowLateSubmission = request.AllowLateSubmission,
            PublishedAtUtc = now,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
        };

        await _repository.AddAssignmentAsync(assignment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        assignment.TutorBatch = batchId.HasValue ? await _batchRepository.GetByIdAsync(batchId.Value, cancellationToken) : null;
        return MapAssignment(assignment, null);
    }

    public async Task<CourseAssignmentResponse> UpdateAsync(
        string authUserId, Guid assignmentId, UpdateCourseAssignmentRequest request, CancellationToken cancellationToken)
    {
        var tutor = await RequireTutorAsync(authUserId, cancellationToken);
        var assignment = await RequireOwnedAssignmentAsync(tutor.Id, assignmentId, cancellationToken);
        EnsureEditable(assignment);

        assignment.Title = request.Title.Trim();
        assignment.Instructions = request.Instructions.Trim();
        assignment.GradingRubric = request.GradingRubric?.Trim();
        assignment.AttachmentUrlsCsv = request.AttachmentUrlsCsv?.Trim();
        assignment.TotalMarks = request.TotalMarks > 0 ? request.TotalMarks : assignment.TotalMarks;
        assignment.AllowResubmission = request.AllowResubmission;
        assignment.AllowLateSubmission = request.AllowLateSubmission;
        assignment.UpdatedAtUtc = DateTime.UtcNow;

        await _repository.UpdateAssignmentAsync(assignment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapAssignment(assignment, null);
    }

    public async Task<CourseAssignmentResponse> ExtendDeadlineAsync(
        string authUserId, Guid assignmentId, ExtendAssignmentDeadlineRequest request, CancellationToken cancellationToken)
    {
        var tutor = await RequireTutorAsync(authUserId, cancellationToken);
        var assignment = await RequireOwnedAssignmentAsync(tutor.Id, assignmentId, cancellationToken);
        assignment.DueDateUtc = request.DueDateUtc.ToUniversalTime();
        assignment.UpdatedAtUtc = DateTime.UtcNow;
        await _repository.UpdateAssignmentAsync(assignment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapAssignment(assignment, null);
    }

    public async Task<CourseAssignmentResponse> RejectAsync(
        string authUserId, Guid assignmentId, AssignmentActionRequest request, CancellationToken cancellationToken)
    {
        var tutor = await RequireTutorAsync(authUserId, cancellationToken);
        var assignment = await RequireOwnedAssignmentAsync(tutor.Id, assignmentId, cancellationToken);
        assignment.Status = AssignmentWorkflowStatus.Rejected;
        assignment.UpdatedAtUtc = DateTime.UtcNow;
        await _repository.UpdateAssignmentAsync(assignment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapAssignment(assignment, null);
    }

    public async Task<CourseAssignmentResponse> CancelAsync(
        string authUserId, Guid assignmentId, AssignmentActionRequest request, CancellationToken cancellationToken)
    {
        var tutor = await RequireTutorAsync(authUserId, cancellationToken);
        var assignment = await RequireOwnedAssignmentAsync(tutor.Id, assignmentId, cancellationToken);
        assignment.Status = AssignmentWorkflowStatus.Cancelled;
        assignment.UpdatedAtUtc = DateTime.UtcNow;
        await _repository.UpdateAssignmentAsync(assignment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapAssignment(assignment, null);
    }

    public async Task<CourseAssignmentResponse> ArchiveAsync(string authUserId, Guid assignmentId, CancellationToken cancellationToken)
    {
        var tutor = await RequireTutorAsync(authUserId, cancellationToken);
        var assignment = await RequireOwnedAssignmentAsync(tutor.Id, assignmentId, cancellationToken);
        assignment.Status = AssignmentWorkflowStatus.Archived;
        assignment.UpdatedAtUtc = DateTime.UtcNow;
        await _repository.UpdateAssignmentAsync(assignment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapAssignment(assignment, null);
    }

    public async Task<CourseAssignmentResponse> RepublishAsync(string authUserId, Guid assignmentId, CancellationToken cancellationToken)
    {
        var tutor = await RequireTutorAsync(authUserId, cancellationToken);
        var assignment = await RequireOwnedAssignmentAsync(tutor.Id, assignmentId, cancellationToken);
        assignment.Status = AssignmentWorkflowStatus.Published;
        assignment.PublishedAtUtc = DateTime.UtcNow;
        assignment.UpdatedAtUtc = DateTime.UtcNow;
        await _repository.UpdateAssignmentAsync(assignment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapAssignment(assignment, null);
    }

    public async Task<IReadOnlyCollection<CourseAssignmentResponse>> GetForTutorAsync(string authUserId, CancellationToken cancellationToken)
    {
        var tutor = await RequireTutorAsync(authUserId, cancellationToken);
        var items = await _repository.GetByTutorAsync(tutor.Id, cancellationToken);
        return items.Select(a => MapAssignment(a, null)).ToArray();
    }

    public async Task<IReadOnlyCollection<CourseAssignmentResponse>> GetForStudentAsync(string authUserId, CancellationToken cancellationToken)
    {
        var student = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Student profile not found.");
        var items = await _repository.GetForStudentAsync(student.Id, cancellationToken);
        var subs = await _repository.GetStudentSubmissionsByAssignmentIdsAsync(
            student.Id, items.Select(a => a.Id), cancellationToken);
        return items.Select(a => MapAssignment(a, subs.GetValueOrDefault(a.Id))).ToArray();
    }

    public async Task<AssignmentSubmissionResponse> SubmitAsync(
        string authUserId, Guid assignmentId, SubmitAssignmentRequest request, CancellationToken cancellationToken)
    {
        var student = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Student profile not found.");

        var assignment = await _repository.GetByIdWithBatchAsync(assignmentId, cancellationToken)
            ?? throw new InvalidOperationException("Assignment not found.");

        if (assignment.Status != AssignmentWorkflowStatus.Published)
        {
            throw new InvalidOperationException("This assignment is no longer accepting submissions.");
        }

        await EnsureStudentEnrolledInAssignmentBatchAsync(student.Id, assignment, cancellationToken);

        var now = DateTime.UtcNow;
        var isLate = now > assignment.DueDateUtc;
        if (isLate && !assignment.AllowLateSubmission)
        {
            throw new InvalidOperationException("The submission deadline has passed.");
        }

        if (string.IsNullOrWhiteSpace(request.FileUrlsCsv) && string.IsNullOrWhiteSpace(request.SubmissionText))
        {
            throw new InvalidOperationException("Upload at least one file or provide submission notes.");
        }

        var existing = (await _repository.GetSubmissionsAsync(assignmentId, cancellationToken))
            .FirstOrDefault(s => s.StudentProfileId == student.Id);

        if (existing != null)
        {
            if (existing.Status is SubmissionStatus.Graded or SubmissionStatus.Rejected)
            {
                throw new InvalidOperationException("This assignment has been graded and cannot be resubmitted.");
            }

            if (existing.Status == SubmissionStatus.Submitted && !assignment.AllowResubmission)
            {
                throw new InvalidOperationException("Resubmission is not allowed for this assignment.");
            }

            if (existing.Status != SubmissionStatus.Returned
                && existing.Status != SubmissionStatus.Pending
                && !assignment.AllowResubmission)
            {
                throw new InvalidOperationException("You have already submitted this assignment.");
            }
        }

        if (existing != null && now > assignment.DueDateUtc && !assignment.AllowLateSubmission)
        {
            throw new InvalidOperationException("The submission deadline has passed.");
        }

        var submission = existing ?? new AssignmentSubmission
        {
            Id = Guid.NewGuid(),
            CourseAssignmentId = assignmentId,
            StudentProfileId = student.Id,
            CreatedAtUtc = now,
        };

        if (existing != null)
        {
            submission.ResubmissionCount += 1;
        }

        submission.SubmissionText = request.SubmissionText?.Trim();
        submission.FileUrlsCsv = request.FileUrlsCsv?.Trim();
        submission.Status = SubmissionStatus.Submitted;
        submission.SubmittedAtUtc = now;
        submission.UpdatedAtUtc = now;

        if (existing == null)
        {
            await _repository.AddSubmissionAsync(submission, cancellationToken);
        }
        else
        {
            await _repository.UpdateSubmissionAsync(submission, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        submission.StudentProfile = student;
        submission.CourseAssignment = assignment;
        return MapSubmission(submission);
    }

    public async Task<AssignmentSubmissionResponse> GradeAsync(
        string authUserId, Guid submissionId, GradeSubmissionRequest request, CancellationToken cancellationToken)
    {
        var tutor = await RequireTutorAsync(authUserId, cancellationToken);
        var submission = await _repository.GetSubmissionAsync(submissionId, cancellationToken)
            ?? throw new InvalidOperationException("Submission not found.");

        if (submission.CourseAssignment.TutorProfileId != tutor.Id)
        {
            throw new InvalidOperationException("Not authorized to grade this submission.");
        }

        if (request.ReturnForCorrection)
        {
            submission.Status = SubmissionStatus.Returned;
            submission.TutorFeedback = request.TutorFeedback?.Trim();
            submission.ReviewedFileUrlsCsv = request.ReviewedFileUrlsCsv?.Trim();
            submission.UpdatedAtUtc = DateTime.UtcNow;
        }
        else
        {
            var totalMarks = submission.CourseAssignment.TotalMarks;
            if (request.MarksObtained < 0)
            {
                throw new InvalidOperationException("Marks obtained cannot be negative.");
            }

            if (request.MarksObtained > totalMarks)
            {
                throw new InvalidOperationException($"Marks obtained cannot exceed total marks ({totalMarks}).");
            }

            var (pct, letter) = GradeCalculator.Compute(request.MarksObtained, totalMarks);
            submission.MarksObtained = request.MarksObtained;
            submission.Percentage = pct;
            submission.GradeLetter = letter;
            submission.TutorFeedback = request.TutorFeedback?.Trim();
            submission.ReviewedFileUrlsCsv = request.ReviewedFileUrlsCsv?.Trim();
            submission.Status = request.Approve ? SubmissionStatus.Graded : SubmissionStatus.Rejected;
            submission.GradedAtUtc = DateTime.UtcNow;
            submission.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _repository.UpdateSubmissionAsync(submission, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapSubmission(submission);
    }

    public async Task<IReadOnlyCollection<AssignmentSubmissionResponse>> GetSubmissionsForAssignmentAsync(
        string authUserId, Guid assignmentId, CancellationToken cancellationToken)
    {
        var tutor = await RequireTutorAsync(authUserId, cancellationToken);
        var assignment = await _repository.GetByIdAsync(assignmentId, cancellationToken)
            ?? throw new InvalidOperationException("Assignment not found.");

        if (assignment.TutorProfileId != tutor.Id)
        {
            throw new InvalidOperationException("Not authorized.");
        }

        var subs = await _repository.GetSubmissionsAsync(assignmentId, cancellationToken);
        return subs.Select(MapSubmission).ToArray();
    }

    public async Task<PaginatedSubmissionsResponse> QuerySubmissionsAsync(
        string authUserId, SubmissionQueryRequest query, CancellationToken cancellationToken)
    {
        var tutor = await RequireTutorAsync(authUserId, cancellationToken);
        var (items, total) = await _repository.QuerySubmissionsForTutorAsync(tutor.Id, query, cancellationToken);
        var pageSize = Math.Clamp(query.PageSize, 1, 50);
        var page = Math.Max(1, query.Page);
        var analytics = await _repository.GetSubmissionAnalyticsAsync(tutor.Id, cancellationToken);

        return new PaginatedSubmissionsResponse
        {
            Items = items.Select(MapSubmission).ToArray(),
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize),
            HasNext = page * pageSize < total,
            HasPrevious = page > 1,
            Analytics = analytics,
        };
    }

    public async Task<AssignmentSubmissionResponse> GetSubmissionDetailAsync(
        string authUserId, Guid submissionId, CancellationToken cancellationToken)
    {
        var submission = await _repository.GetSubmissionAsync(submissionId, cancellationToken)
            ?? throw new InvalidOperationException("Submission not found.");

        var tutor = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
        var student = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);

        var isTutor = tutor?.Id == submission.CourseAssignment.TutorProfileId;
        var isOwner = student?.Id == submission.StudentProfileId;
        if (!isTutor && !isOwner)
        {
            throw new InvalidOperationException("Not authorized to view this submission.");
        }

        return MapSubmission(submission);
    }

    private async Task<TutorProfile> RequireTutorAsync(string authUserId, CancellationToken cancellationToken) =>
        await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor profile not found.");

    private async Task<CourseAssignment> RequireOwnedAssignmentAsync(
        Guid tutorId, Guid assignmentId, CancellationToken cancellationToken)
    {
        var assignment = await _repository.GetByIdWithBatchAsync(assignmentId, cancellationToken)
            ?? throw new InvalidOperationException("Assignment not found.");
        if (assignment.TutorProfileId != tutorId)
        {
            throw new InvalidOperationException("Not authorized.");
        }

        return assignment;
    }

    private static void EnsureEditable(CourseAssignment assignment)
    {
        if (assignment.Status != AssignmentWorkflowStatus.Published)
        {
            throw new InvalidOperationException("Only published assignments can be edited.");
        }

        var publishedAt = assignment.PublishedAtUtc ?? assignment.CreatedAtUtc;
        if (DateTime.UtcNow - publishedAt > EditWindow)
        {
            throw new InvalidOperationException("Editing is locked after 1 hour. You may extend the deadline only.");
        }
    }

    private async Task EnsureStudentEnrolledInAssignmentBatchAsync(
        Guid studentProfileId, CourseAssignment assignment, CancellationToken cancellationToken)
    {
        if (!assignment.TutorBatchId.HasValue)
        {
            return;
        }

        var enrollments = await _enrollmentRepository.GetByStudentAsync(studentProfileId, cancellationToken);
        var enrolled = enrollments.Any(e =>
            e.TutorBatchId == assignment.TutorBatchId &&
            (e.Status == BatchEnrollmentStatus.Active || e.Status == BatchEnrollmentStatus.Pending));
        if (!enrolled)
        {
            throw new InvalidOperationException("You are not enrolled in the batch for this assignment.");
        }
    }

    private static CourseAssignmentResponse MapAssignment(CourseAssignment a, AssignmentSubmission? submission)
    {
        var publishedAt = a.PublishedAtUtc ?? a.CreatedAtUtc;
        var editLocked = a.Status == AssignmentWorkflowStatus.Published &&
                         DateTime.UtcNow - publishedAt > EditWindow;

        return new CourseAssignmentResponse
        {
            Id = a.Id,
            TutorBatchId = a.TutorBatchId,
            BatchTitle = a.TutorBatch?.Title,
            Subject = a.Subject,
            Title = a.Title,
            Instructions = a.Instructions,
            GradingRubric = a.GradingRubric,
            AttachmentUrlsCsv = a.AttachmentUrlsCsv,
            TotalMarks = a.TotalMarks,
            DueDateUtc = a.DueDateUtc,
            Status = a.Status.ToString(),
            IsOverdue = a.DueDateUtc < DateTime.UtcNow && a.Status == AssignmentWorkflowStatus.Published,
            AllowResubmission = a.AllowResubmission,
            AllowLateSubmission = a.AllowLateSubmission,
            CanEdit = a.Status == AssignmentWorkflowStatus.Published && !editLocked,
            IsEditLocked = editLocked,
            PublishedAtUtc = a.PublishedAtUtc,
            CreatedAtUtc = a.CreatedAtUtc,
            SubmissionStatus = submission?.Status.ToString(),
            MarksObtained = submission?.MarksObtained,
            GradeLetter = submission?.GradeLetter,
            Percentage = submission?.Percentage,
            TutorFeedback = submission?.TutorFeedback,
            SubmittedFileUrlsCsv = submission?.FileUrlsCsv,
            SubmittedAtUtc = submission?.SubmittedAtUtc,
            IsLate = submission?.SubmittedAtUtc != null && submission.SubmittedAtUtc > a.DueDateUtc,
        };
    }

    private static AssignmentSubmissionResponse MapSubmission(AssignmentSubmission s)
    {
        var fileCount = string.IsNullOrWhiteSpace(s.FileUrlsCsv)
            ? 0
            : s.FileUrlsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Length;

        return new AssignmentSubmissionResponse
        {
            Id = s.Id,
            CourseAssignmentId = s.CourseAssignmentId,
            AssignmentTitle = s.CourseAssignment?.Title ?? string.Empty,
            TutorBatchId = s.CourseAssignment?.TutorBatchId,
            BatchTitle = s.CourseAssignment?.TutorBatch?.Title,
            StudentProfileId = s.StudentProfileId,
            StudentName = s.StudentProfile?.UserAccount?.FullName ?? string.Empty,
            Status = s.Status.ToString(),
            SubmissionText = s.SubmissionText,
            FileUrlsCsv = s.FileUrlsCsv,
            FileCount = fileCount,
            MarksObtained = s.MarksObtained,
            GradeLetter = s.GradeLetter,
            Percentage = s.Percentage,
            TutorFeedback = s.TutorFeedback,
            ReviewedFileUrlsCsv = s.ReviewedFileUrlsCsv,
            SubmittedAtUtc = s.SubmittedAtUtc,
            GradedAtUtc = s.GradedAtUtc,
            DueDateUtc = s.CourseAssignment?.DueDateUtc ?? DateTime.UtcNow,
            IsLate = s.SubmittedAtUtc != null && s.CourseAssignment != null &&
                     s.SubmittedAtUtc > s.CourseAssignment.DueDateUtc,
            ResubmissionCount = s.ResubmissionCount,
            TotalMarks = s.CourseAssignment?.TotalMarks ?? 0,
        };
    }
}
