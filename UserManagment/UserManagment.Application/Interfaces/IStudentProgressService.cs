using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;

namespace UserManagment.Application.Interfaces;

public interface IStudentProgressService
{
    Task<StudentProgressResponse> GetStudentProgressAsync(Guid studentProfileId, CancellationToken cancellationToken);
    Task<LearningGoalResponse> AddLearningGoalAsync(Guid studentProfileId, AddLearningGoalRequest request, CancellationToken cancellationToken);
    Task<LearningGoalResponse> UpdateGoalStatusAsync(Guid goalId, Guid studentProfileId, UpdateGoalStatusRequest request, CancellationToken cancellationToken);
    Task<AssessmentRecordResponse> AddAssessmentRecordAsync(Guid studentProfileId, Guid? tutorProfileId, string submittedByUserId, AddAssessmentRecordRequest request, CancellationToken cancellationToken);
    Task<SessionNoteResponse> AddSessionNoteAsync(Guid tutorProfileId, AddSessionNoteRequest request, CancellationToken cancellationToken);
}
