using Microsoft.EntityFrameworkCore;
using UserManagment.Domain.Entities;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.API.Services;

public interface IAdminPermanentUserDeletionService
{
    Task DeletePermanentlyAsync(UserAccount target, CancellationToken cancellationToken);
}

public class AdminPermanentUserDeletionService : IAdminPermanentUserDeletionService
{
    private readonly UserManagmentDbContext _context;

    public AdminPermanentUserDeletionService(UserManagmentDbContext context) => _context = context;

    public async Task DeletePermanentlyAsync(UserAccount target, CancellationToken cancellationToken)
    {
        var authUserId = target.AuthUserId;

        if (target.TutorProfile != null)
        {
            await DeleteTutorDataAsync(target.TutorProfile.Id, cancellationToken);
        }

        if (target.StudentProfile != null)
        {
            await DeleteStudentDataAsync(target.StudentProfile.Id, cancellationToken);
        }

        await _context.Notifications.Where(n => n.RecipientAuthUserId == authUserId).ExecuteDeleteAsync(cancellationToken);
        await _context.UserWarnings.Where(w => w.TargetAuthUserId == authUserId).ExecuteDeleteAsync(cancellationToken);
        await _context.AccountRestrictions.Where(r => r.TargetAuthUserId == authUserId).ExecuteDeleteAsync(cancellationToken);
        await _context.BlockedUsers.Where(b => b.BlockerAuthUserId == authUserId || b.BlockedAuthUserId == authUserId).ExecuteDeleteAsync(cancellationToken);
        await _context.ChatMessages.Where(m => m.SenderAuthUserId == authUserId || m.ReceiverAuthUserId == authUserId).ExecuteDeleteAsync(cancellationToken);

        _context.UserAccounts.Remove(target);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task DeleteTutorDataAsync(Guid tutorProfileId, CancellationToken cancellationToken)
    {
        var batchIds = await _context.TutorBatches
            .Where(b => b.TutorProfileId == tutorProfileId)
            .Select(b => b.Id)
            .ToListAsync(cancellationToken);

        if (batchIds.Count > 0)
        {
            var sessionIds = await _context.GeneratedClassSessions
                .Where(s => batchIds.Contains(s.TutorBatchId))
                .Select(s => s.Id)
                .ToListAsync(cancellationToken);
            if (sessionIds.Count > 0)
            {
                await _context.SessionAttendances.Where(a => sessionIds.Contains(a.GeneratedClassSessionId)).ExecuteDeleteAsync(cancellationToken);
            }

            await _context.BatchEnrollments.Where(e => batchIds.Contains(e.TutorBatchId)).ExecuteDeleteAsync(cancellationToken);
            await _context.GeneratedClassSessions.Where(s => batchIds.Contains(s.TutorBatchId)).ExecuteDeleteAsync(cancellationToken);
            await _context.StudyMaterials.Where(m => m.TutorBatchId != null && batchIds.Contains(m.TutorBatchId.Value)).ExecuteDeleteAsync(cancellationToken);
            await _context.TutorBatches.Where(b => batchIds.Contains(b.Id)).ExecuteDeleteAsync(cancellationToken);
        }

        var assignmentIds = await _context.CourseAssignments
            .Where(a => a.TutorProfileId == tutorProfileId)
            .Select(a => a.Id)
            .ToListAsync(cancellationToken);
        if (assignmentIds.Count > 0)
        {
            await _context.AssignmentSubmissions.Where(s => assignmentIds.Contains(s.CourseAssignmentId)).ExecuteDeleteAsync(cancellationToken);
            await _context.CourseAssignments.Where(a => assignmentIds.Contains(a.Id)).ExecuteDeleteAsync(cancellationToken);
        }

        await _context.StudyMaterials.Where(m => m.TutorProfileId == tutorProfileId).ExecuteDeleteAsync(cancellationToken);
        await _context.Bookings.Where(b => b.TutorProfileId == tutorProfileId).ExecuteDeleteAsync(cancellationToken);
        await _context.BatchEnrollments.Where(e => e.TutorProfileId == tutorProfileId).ExecuteDeleteAsync(cancellationToken);
        await _context.Reviews.Where(r => r.TutorProfileId == tutorProfileId).ExecuteDeleteAsync(cancellationToken);
        await _context.SessionNotes.Where(n => n.TutorProfileId == tutorProfileId).ExecuteDeleteAsync(cancellationToken);
        await _context.GeneratedClassSessions.Where(s => s.TutorProfileId == tutorProfileId).ExecuteDeleteAsync(cancellationToken);
        await _context.TutorVerificationAudits.Where(a => a.TutorProfileId == tutorProfileId).ExecuteDeleteAsync(cancellationToken);
        await _context.TutorBatches.Where(b => b.TutorProfileId == tutorProfileId).ExecuteDeleteAsync(cancellationToken);
    }

    private async Task DeleteStudentDataAsync(Guid studentProfileId, CancellationToken cancellationToken)
    {
        await _context.Payments.Where(p => p.StudentProfileId == studentProfileId).ExecuteDeleteAsync(cancellationToken);
        await _context.BatchEnrollments.Where(e => e.StudentProfileId == studentProfileId).ExecuteDeleteAsync(cancellationToken);
        await _context.AssignmentSubmissions.Where(s => s.StudentProfileId == studentProfileId).ExecuteDeleteAsync(cancellationToken);
        await _context.Bookings.Where(b => b.StudentProfileId == studentProfileId).ExecuteDeleteAsync(cancellationToken);
        await _context.Reviews.Where(r => r.StudentProfileId == studentProfileId).ExecuteDeleteAsync(cancellationToken);
        await _context.SessionNotes.Where(n => n.StudentProfileId == studentProfileId).ExecuteDeleteAsync(cancellationToken);
        await _context.LearningGoals.Where(g => g.StudentProfileId == studentProfileId).ExecuteDeleteAsync(cancellationToken);
        await _context.AssessmentRecords.Where(a => a.StudentProfileId == studentProfileId).ExecuteDeleteAsync(cancellationToken);
        await _context.SessionAttendances.Where(a => a.StudentProfileId == studentProfileId).ExecuteDeleteAsync(cancellationToken);
        await _context.Payments.Where(p => p.StudentProfileId == studentProfileId).ExecuteDeleteAsync(cancellationToken);
    }
}
