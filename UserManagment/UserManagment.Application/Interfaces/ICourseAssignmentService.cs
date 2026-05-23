using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;

namespace UserManagment.Application.Interfaces;

public interface ICourseAssignmentService
{
    Task<CourseAssignmentResponse> CreateAsync(string authUserId, CreateCourseAssignmentRequest request, CancellationToken cancellationToken);
    Task<CourseAssignmentResponse> UpdateAsync(string authUserId, Guid assignmentId, UpdateCourseAssignmentRequest request, CancellationToken cancellationToken);
    Task<CourseAssignmentResponse> ExtendDeadlineAsync(string authUserId, Guid assignmentId, ExtendAssignmentDeadlineRequest request, CancellationToken cancellationToken);
    Task<CourseAssignmentResponse> RejectAsync(string authUserId, Guid assignmentId, AssignmentActionRequest request, CancellationToken cancellationToken);
    Task<CourseAssignmentResponse> CancelAsync(string authUserId, Guid assignmentId, AssignmentActionRequest request, CancellationToken cancellationToken);
    Task<CourseAssignmentResponse> ArchiveAsync(string authUserId, Guid assignmentId, CancellationToken cancellationToken);
    Task<CourseAssignmentResponse> RepublishAsync(string authUserId, Guid assignmentId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<CourseAssignmentResponse>> GetForTutorAsync(string authUserId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<CourseAssignmentResponse>> GetForStudentAsync(string authUserId, CancellationToken cancellationToken);
    Task<AssignmentSubmissionResponse> SubmitAsync(string authUserId, Guid assignmentId, SubmitAssignmentRequest request, CancellationToken cancellationToken);
    Task<AssignmentSubmissionResponse> GradeAsync(string authUserId, Guid submissionId, GradeSubmissionRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<AssignmentSubmissionResponse>> GetSubmissionsForAssignmentAsync(string authUserId, Guid assignmentId, CancellationToken cancellationToken);
    Task<PaginatedSubmissionsResponse> QuerySubmissionsAsync(string authUserId, SubmissionQueryRequest query, CancellationToken cancellationToken);
    Task<AssignmentSubmissionResponse> GetSubmissionDetailAsync(string authUserId, Guid submissionId, CancellationToken cancellationToken);
}
