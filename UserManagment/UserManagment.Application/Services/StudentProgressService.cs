using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;

namespace UserManagment.Application.Services;

public class StudentProgressService : IStudentProgressService
{
    private readonly IStudentProgressRepository _progressRepository;
    private readonly IUnitOfWork _unitOfWork;

    public StudentProgressService(IStudentProgressRepository progressRepository, IUnitOfWork unitOfWork)
    {
        _progressRepository = progressRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<StudentProgressResponse> GetStudentProgressAsync(Guid studentProfileId, CancellationToken cancellationToken)
    {
        var goals = await _progressRepository.GetGoalsByStudentAsync(studentProfileId, cancellationToken);
        var assessments = await _progressRepository.GetAssessmentsByStudentAsync(studentProfileId, cancellationToken);
        var notes = await _progressRepository.GetSessionNotesByStudentAsync(studentProfileId, cancellationToken);

        // Calculate weak subjects: group by subject+topic, average score percentage, take bottom 3
        var weakSubjects = assessments
            .Where(a => a.TotalScore > 0)
            .GroupBy(a => new { a.Subject, a.TopicTag })
            .Select(g => new WeakSubjectResponse
            {
                Subject = g.Key.Subject,
                TopicTag = g.Key.TopicTag,
                AverageScore = Math.Round(g.Average(a => (a.ScoreObtained / a.TotalScore) * 100), 1)
            })
            .OrderBy(w => w.AverageScore)
            .Take(3)
            .ToArray();

        return new StudentProgressResponse
        {
            Goals = goals.Select(ToGoalResponse).ToArray(),
            Assessments = assessments.Select(ToAssessmentResponse).ToArray(),
            SessionNotes = notes.Select(ToNoteResponse).ToArray(),
            WeakSubjects = weakSubjects
        };
    }

    public async Task<LearningGoalResponse> AddLearningGoalAsync(Guid studentProfileId, AddLearningGoalRequest request, CancellationToken cancellationToken)
    {
        var goal = new LearningGoal
        {
            Id = Guid.NewGuid(),
            StudentProfileId = studentProfileId,
            Title = request.Title,
            Description = request.Description,
            TargetDate = request.TargetDate,
            Status = "Not Started",
            CreatedAtUtc = DateTime.UtcNow
        };
        await _progressRepository.AddLearningGoalAsync(goal, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ToGoalResponse(goal);
    }

    public async Task<LearningGoalResponse> UpdateGoalStatusAsync(Guid goalId, Guid studentProfileId, UpdateGoalStatusRequest request, CancellationToken cancellationToken)
    {
        var goal = await _progressRepository.GetGoalByIdAsync(goalId, cancellationToken)
            ?? throw new InvalidOperationException("Learning goal not found.");

        if (goal.StudentProfileId != studentProfileId)
        {
            throw new UnauthorizedAccessException("You do not own this learning goal.");
        }

        var validStatuses = new[] { "Not Started", "In Progress", "Achieved" };
        if (!validStatuses.Contains(request.Status))
            throw new InvalidOperationException($"Invalid status. Must be one of: {string.Join(", ", validStatuses)}");

        goal.Status = request.Status;
        await _progressRepository.UpdateLearningGoalAsync(goal, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ToGoalResponse(goal);
    }

    public async Task<AssessmentRecordResponse> AddAssessmentRecordAsync(Guid studentProfileId, Guid? tutorProfileId, string submittedByUserId, AddAssessmentRecordRequest request, CancellationToken cancellationToken)
    {
        var record = new AssessmentRecord
        {
            Id = Guid.NewGuid(),
            StudentProfileId = studentProfileId,
            TutorProfileId = tutorProfileId,
            SubmittedByUserId = submittedByUserId,
            Title = request.Title,
            Subject = request.Subject,
            TopicTag = request.TopicTag,
            ScoreObtained = request.ScoreObtained,
            TotalScore = request.TotalScore,
            StudentConfidenceLevel = request.StudentConfidenceLevel,
            DateRecorded = request.DateRecorded ?? DateTime.UtcNow
        };
        await _progressRepository.AddAssessmentRecordAsync(record, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ToAssessmentResponse(record);
    }

    public async Task<SessionNoteResponse> AddSessionNoteAsync(Guid tutorProfileId, AddSessionNoteRequest request, CancellationToken cancellationToken)
    {
        var note = new SessionNote
        {
            Id = Guid.NewGuid(),
            BookingId = request.BookingId,
            StudentProfileId = request.StudentProfileId,
            TutorProfileId = tutorProfileId,
            TopicsCovered = request.TopicsCovered,
            Remarks = request.Remarks,
            AreasForImprovement = request.AreasForImprovement,
            ResourceLinksCsv = request.ResourceLinksCsv,
            CreatedAtUtc = DateTime.UtcNow
        };
        await _progressRepository.AddSessionNoteAsync(note, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ToNoteResponse(note);
    }

    private static LearningGoalResponse ToGoalResponse(LearningGoal g) => new()
    {
        Id = g.Id,
        Title = g.Title,
        Description = g.Description,
        TargetDate = g.TargetDate,
        Status = g.Status,
        CreatedAtUtc = g.CreatedAtUtc
    };

    private static AssessmentRecordResponse ToAssessmentResponse(AssessmentRecord a) => new()
    {
        Id = a.Id,
        Title = a.Title,
        Subject = a.Subject,
        TopicTag = a.TopicTag,
        ScoreObtained = a.ScoreObtained,
        TotalScore = a.TotalScore,
        ScorePercentage = a.TotalScore > 0 ? Math.Round((a.ScoreObtained / a.TotalScore) * 100, 1) : 0,
        StudentConfidenceLevel = a.StudentConfidenceLevel,
        SubmittedByUserId = a.SubmittedByUserId,
        DateRecorded = a.DateRecorded
    };

    private static SessionNoteResponse ToNoteResponse(SessionNote n) => new()
    {
        Id = n.Id,
        BookingId = n.BookingId,
        TutorFullName = n.TutorProfile?.UserAccount?.FullName ?? "Tutor",
        TopicsCovered = n.TopicsCovered,
        Remarks = n.Remarks,
        AreasForImprovement = n.AreasForImprovement,
        ResourceLinks = n.ResourceLinksCsv?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
        CreatedAtUtc = n.CreatedAtUtc
    };
}
