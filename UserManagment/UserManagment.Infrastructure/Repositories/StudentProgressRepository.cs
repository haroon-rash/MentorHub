using Microsoft.EntityFrameworkCore;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.Infrastructure.Repositories;

public class StudentProgressRepository : IStudentProgressRepository
{
    private readonly UserManagmentDbContext _context;

    public StudentProgressRepository(UserManagmentDbContext context)
    {
        _context = context;
    }

    // Goals
    public async Task AddLearningGoalAsync(LearningGoal goal, CancellationToken cancellationToken)
        => await _context.LearningGoals.AddAsync(goal, cancellationToken);

    public Task UpdateLearningGoalAsync(LearningGoal goal, CancellationToken cancellationToken)
    {
        _context.LearningGoals.Update(goal);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyCollection<LearningGoal>> GetGoalsByStudentAsync(Guid studentProfileId, CancellationToken cancellationToken)
        => await _context.LearningGoals
            .Where(g => g.StudentProfileId == studentProfileId)
            .OrderByDescending(g => g.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task<LearningGoal?> GetGoalByIdAsync(Guid id, CancellationToken cancellationToken)
        => await _context.LearningGoals.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);

    // Assessments
    public async Task AddAssessmentRecordAsync(AssessmentRecord record, CancellationToken cancellationToken)
        => await _context.AssessmentRecords.AddAsync(record, cancellationToken);

    public async Task<IReadOnlyCollection<AssessmentRecord>> GetAssessmentsByStudentAsync(Guid studentProfileId, CancellationToken cancellationToken)
        => await _context.AssessmentRecords
            .Where(a => a.StudentProfileId == studentProfileId)
            .OrderByDescending(a => a.DateRecorded)
            .ToListAsync(cancellationToken);

    // Session Notes
    public async Task AddSessionNoteAsync(SessionNote note, CancellationToken cancellationToken)
        => await _context.SessionNotes.AddAsync(note, cancellationToken);

    public async Task<IReadOnlyCollection<SessionNote>> GetSessionNotesByStudentAsync(Guid studentProfileId, CancellationToken cancellationToken)
        => await _context.SessionNotes
            .Where(n => n.StudentProfileId == studentProfileId)
            .Include(n => n.TutorProfile)
            .ThenInclude(t => t.UserAccount)
            .OrderByDescending(n => n.CreatedAtUtc)
            .ToListAsync(cancellationToken);
}
