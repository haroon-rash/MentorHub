using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Domain.Entities;

namespace UserManagment.Application.Interfaces;

public interface ICourseAssignmentRepository
{
    Task<CourseAssignment?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<CourseAssignment?> GetByIdWithBatchAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<CourseAssignment>> GetForStudentAsync(Guid studentProfileId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<CourseAssignment>> GetByTutorAsync(Guid tutorProfileId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<AssignmentSubmission>> GetSubmissionsAsync(Guid assignmentId, CancellationToken cancellationToken);
    Task<AssignmentSubmission?> GetSubmissionAsync(Guid submissionId, CancellationToken cancellationToken);
    Task<IReadOnlyDictionary<Guid, AssignmentSubmission>> GetStudentSubmissionsByAssignmentIdsAsync(
        Guid studentProfileId, IEnumerable<Guid> assignmentIds, CancellationToken cancellationToken);
    Task<(IReadOnlyList<AssignmentSubmission> Items, int TotalCount)> QuerySubmissionsForTutorAsync(
        Guid tutorProfileId, SubmissionQueryRequest query, CancellationToken cancellationToken);
    Task<SubmissionAnalyticsResponse> GetSubmissionAnalyticsAsync(Guid tutorProfileId, CancellationToken cancellationToken);
    Task AddAssignmentAsync(CourseAssignment assignment, CancellationToken cancellationToken);
    Task UpdateAssignmentAsync(CourseAssignment assignment, CancellationToken cancellationToken);
    Task AddSubmissionAsync(AssignmentSubmission submission, CancellationToken cancellationToken);
    Task UpdateSubmissionAsync(AssignmentSubmission submission, CancellationToken cancellationToken);
}
