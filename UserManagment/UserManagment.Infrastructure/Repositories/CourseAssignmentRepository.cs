using Microsoft.EntityFrameworkCore;
using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.Infrastructure.Repositories;

public class CourseAssignmentRepository : ICourseAssignmentRepository
{
    private readonly UserManagmentDbContext _db;

    public CourseAssignmentRepository(UserManagmentDbContext db) => _db = db;

    public Task<CourseAssignment?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        _db.CourseAssignments.FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted, cancellationToken);

    public Task<CourseAssignment?> GetByIdWithBatchAsync(Guid id, CancellationToken cancellationToken) =>
        _db.CourseAssignments
            .Include(a => a.TutorBatch)
            .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted, cancellationToken);

    public async Task<IReadOnlyCollection<CourseAssignment>> GetForStudentAsync(Guid studentProfileId, CancellationToken cancellationToken)
    {
        var batchIds = await _db.BatchEnrollments
            .Where(e => e.StudentProfileId == studentProfileId &&
                        (e.Status == BatchEnrollmentStatus.Active || e.Status == BatchEnrollmentStatus.Pending))
            .Select(e => e.TutorBatchId)
            .ToListAsync(cancellationToken);

        return await _db.CourseAssignments
            .Where(a => !a.IsDeleted &&
                        a.Status == AssignmentWorkflowStatus.Published &&
                        (a.TutorBatchId == null || batchIds.Contains(a.TutorBatchId.Value)))
            .OrderByDescending(a => a.DueDateUtc)
            .ToArrayAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<CourseAssignment>> GetByTutorAsync(Guid tutorProfileId, CancellationToken cancellationToken) =>
        await _db.CourseAssignments
            .Include(a => a.TutorBatch)
            .Where(a => a.TutorProfileId == tutorProfileId && !a.IsDeleted)
            .OrderByDescending(a => a.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);

    public async Task<IReadOnlyCollection<AssignmentSubmission>> GetSubmissionsAsync(Guid assignmentId, CancellationToken cancellationToken) =>
        await _db.AssignmentSubmissions
            .Include(s => s.StudentProfile).ThenInclude(st => st.UserAccount)
            .Include(s => s.CourseAssignment).ThenInclude(a => a.TutorBatch)
            .Where(s => s.CourseAssignmentId == assignmentId)
            .ToArrayAsync(cancellationToken);

    public Task<AssignmentSubmission?> GetSubmissionAsync(Guid submissionId, CancellationToken cancellationToken) =>
        _db.AssignmentSubmissions
            .Include(s => s.StudentProfile).ThenInclude(st => st.UserAccount)
            .Include(s => s.CourseAssignment).ThenInclude(a => a.TutorBatch)
            .FirstOrDefaultAsync(s => s.Id == submissionId, cancellationToken);

    public async Task<IReadOnlyDictionary<Guid, AssignmentSubmission>> GetStudentSubmissionsByAssignmentIdsAsync(
        Guid studentProfileId, IEnumerable<Guid> assignmentIds, CancellationToken cancellationToken)
    {
        var ids = assignmentIds.ToList();
        var subs = await _db.AssignmentSubmissions
            .Where(s => s.StudentProfileId == studentProfileId && ids.Contains(s.CourseAssignmentId))
            .ToListAsync(cancellationToken);
        return subs.ToDictionary(s => s.CourseAssignmentId);
    }

    public async Task<(IReadOnlyList<AssignmentSubmission> Items, int TotalCount)> QuerySubmissionsForTutorAsync(
        Guid tutorProfileId, SubmissionQueryRequest query, CancellationToken cancellationToken)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 50);

        var q = _db.AssignmentSubmissions
            .Include(s => s.StudentProfile).ThenInclude(st => st.UserAccount)
            .Include(s => s.CourseAssignment).ThenInclude(a => a.TutorBatch)
            .Where(s => s.CourseAssignment.TutorProfileId == tutorProfileId && !s.CourseAssignment.IsDeleted);

        if (query.BatchId.HasValue)
        {
            q = q.Where(s => s.CourseAssignment.TutorBatchId == query.BatchId);
        }

        if (query.AssignmentId.HasValue)
        {
            q = q.Where(s => s.CourseAssignmentId == query.AssignmentId);
        }

        if (query.StudentProfileId.HasValue)
        {
            q = q.Where(s => s.StudentProfileId == query.StudentProfileId);
        }

        if (!string.IsNullOrWhiteSpace(query.SubmissionStatus))
        {
            if (Enum.TryParse<SubmissionStatus>(query.SubmissionStatus, true, out var status))
            {
                q = q.Where(s => s.Status == status);
            }
        }

        if (string.Equals(query.GradingStatus, "graded", StringComparison.OrdinalIgnoreCase))
        {
            q = q.Where(s => s.Status == SubmissionStatus.Graded);
        }
        else if (string.Equals(query.GradingStatus, "pending", StringComparison.OrdinalIgnoreCase))
        {
            q = q.Where(s => s.Status == SubmissionStatus.Submitted);
        }

        if (query.IsLate == true)
        {
            q = q.Where(s => s.SubmittedAtUtc != null && s.SubmittedAtUtc > s.CourseAssignment.DueDateUtc);
        }
        else if (query.IsLate == false)
        {
            q = q.Where(s => s.SubmittedAtUtc != null && s.SubmittedAtUtc <= s.CourseAssignment.DueDateUtc);
        }

        if (query.WeekStartUtc.HasValue)
        {
            var weekEnd = query.WeekStartUtc.Value.AddDays(7);
            q = q.Where(s => s.SubmittedAtUtc >= query.WeekStartUtc && s.SubmittedAtUtc < weekEnd);
        }

        if (query.MonthStartUtc.HasValue)
        {
            var monthEnd = query.MonthStartUtc.Value.AddMonths(1);
            q = q.Where(s => s.SubmittedAtUtc >= query.MonthStartUtc && s.SubmittedAtUtc < monthEnd);
        }

        var total = await q.CountAsync(cancellationToken);
        var items = await q
            .OrderByDescending(s => s.SubmittedAtUtc ?? s.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, total);
    }

    public async Task<SubmissionAnalyticsResponse> GetSubmissionAnalyticsAsync(Guid tutorProfileId, CancellationToken cancellationToken)
    {
        var assignments = await _db.CourseAssignments
            .Where(a => a.TutorProfileId == tutorProfileId && !a.IsDeleted &&
                        a.Status == AssignmentWorkflowStatus.Published)
            .Select(a => new { a.Id, a.DueDateUtc, a.TutorBatchId })
            .ToListAsync(cancellationToken);

        var assignmentIds = assignments.Select(a => a.Id).ToList();
        var subs = await _db.AssignmentSubmissions
            .Where(s => assignmentIds.Contains(s.CourseAssignmentId))
            .Select(s => new { s.CourseAssignmentId, s.Status, s.SubmittedAtUtc })
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var enrolledCounts = await _db.BatchEnrollments
            .Where(e => e.TutorProfileId == tutorProfileId &&
                        (e.Status == BatchEnrollmentStatus.Active || e.Status == BatchEnrollmentStatus.Pending))
            .GroupBy(e => e.TutorBatchId)
            .Select(g => new { BatchId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.BatchId, x => x.Count, cancellationToken);

        var missing = 0;
        foreach (var a in assignments)
        {
            var submittedStudentIds = subs.Where(s => s.CourseAssignmentId == a.Id).Select(s => s.CourseAssignmentId).Count();
            var expected = a.TutorBatchId.HasValue && enrolledCounts.TryGetValue(a.TutorBatchId.Value, out var c) ? c : 0;
            missing += Math.Max(0, expected - submittedStudentIds);
        }

        return new SubmissionAnalyticsResponse
        {
            TotalAssignments = assignments.Count,
            PendingCount = subs.Count(s => s.Status == SubmissionStatus.Submitted),
            LateCount = subs.Count(s => s.SubmittedAtUtc != null && s.SubmittedAtUtc > assignments.First(x => x.Id == s.CourseAssignmentId).DueDateUtc),
            MissingCount = missing,
            ReviewedCount = subs.Count(s => s.Status is SubmissionStatus.Graded or SubmissionStatus.Rejected or SubmissionStatus.Returned),
            GradedCount = subs.Count(s => s.Status == SubmissionStatus.Graded),
        };
    }

    public async Task AddAssignmentAsync(CourseAssignment assignment, CancellationToken cancellationToken) =>
        await _db.CourseAssignments.AddAsync(assignment, cancellationToken);

    public Task UpdateAssignmentAsync(CourseAssignment assignment, CancellationToken cancellationToken)
    {
        _db.CourseAssignments.Update(assignment);
        return Task.CompletedTask;
    }

    public async Task AddSubmissionAsync(AssignmentSubmission submission, CancellationToken cancellationToken) =>
        await _db.AssignmentSubmissions.AddAsync(submission, cancellationToken);

    public Task UpdateSubmissionAsync(AssignmentSubmission submission, CancellationToken cancellationToken)
    {
        _db.AssignmentSubmissions.Update(submission);
        return Task.CompletedTask;
    }
}
