using UserManagment.Domain.Entities;

namespace UserManagment.Application.Interfaces;

public interface IStudentProgressRepository
{
    // Goals
    Task AddLearningGoalAsync(LearningGoal goal, CancellationToken cancellationToken);
    Task UpdateLearningGoalAsync(LearningGoal goal, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<LearningGoal>> GetGoalsByStudentAsync(Guid studentProfileId, CancellationToken cancellationToken);
    Task<LearningGoal?> GetGoalByIdAsync(Guid id, CancellationToken cancellationToken);
    
    // Assessments
    Task AddAssessmentRecordAsync(AssessmentRecord record, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<AssessmentRecord>> GetAssessmentsByStudentAsync(Guid studentProfileId, CancellationToken cancellationToken);
    
    // Session Notes
    Task AddSessionNoteAsync(SessionNote note, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<SessionNote>> GetSessionNotesByStudentAsync(Guid studentProfileId, CancellationToken cancellationToken);
}
