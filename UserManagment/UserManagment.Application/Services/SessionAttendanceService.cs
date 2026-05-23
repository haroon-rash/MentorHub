using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Helpers;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Services;

public class SessionAttendanceService : ISessionAttendanceService
{
    private readonly ITutorProfileRepository _tutorProfileRepository;
    private readonly IBatchEnrollmentRepository _enrollmentRepository;
    private readonly ISessionAttendanceRepository _attendanceRepository;
    private readonly ITutorBatchRepository _batchRepository;
    private readonly IUnitOfWork _unitOfWork;

    public SessionAttendanceService(
        ITutorProfileRepository tutorProfileRepository,
        IBatchEnrollmentRepository enrollmentRepository,
        ISessionAttendanceRepository attendanceRepository,
        ITutorBatchRepository batchRepository,
        IUnitOfWork unitOfWork)
    {
        _tutorProfileRepository = tutorProfileRepository;
        _enrollmentRepository = enrollmentRepository;
        _attendanceRepository = attendanceRepository;
        _batchRepository = batchRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task RecordAttendanceAsync(
        string authUserId, RecordSessionAttendanceRequest request, CancellationToken cancellationToken)
    {
        var tutor = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor profile not found.");

        var session = await _batchRepository.GetSessionByIdAsync(request.GeneratedClassSessionId, cancellationToken)
            ?? throw new InvalidOperationException("Session not found.");

        if (session.TutorProfileId != tutor.Id)
        {
            throw new UnauthorizedAccessException("Not authorized for this session.");
        }

        var enrollment = await _enrollmentRepository.GetByIdAsync(request.BatchEnrollmentId, cancellationToken)
            ?? throw new InvalidOperationException("Enrollment not found.");

        if (enrollment.StudentProfileId != request.StudentProfileId)
        {
            throw new InvalidOperationException("Student does not match enrollment.");
        }

        enrollment.TutorProfile ??= tutor;
        DualRoleValidationHelper.EnsureNotSelfTutorAction(enrollment);

        var existing = await _attendanceRepository.GetAsync(
            request.GeneratedClassSessionId, request.StudentProfileId, cancellationToken);

        var now = DateTime.UtcNow;
        if (existing is null)
        {
            await _attendanceRepository.AddAsync(new SessionAttendance
            {
                Id = Guid.NewGuid(),
                GeneratedClassSessionId = request.GeneratedClassSessionId,
                StudentProfileId = request.StudentProfileId,
                BatchEnrollmentId = request.BatchEnrollmentId,
                IsPresent = request.IsPresent,
                Notes = request.Notes?.Trim(),
                RecordedAtUtc = now,
            }, cancellationToken);
        }
        else
        {
            existing.IsPresent = request.IsPresent;
            existing.Notes = request.Notes?.Trim();
            existing.RecordedAtUtc = now;
            await _attendanceRepository.UpdateAsync(existing, cancellationToken);
        }

        if (request.IsPresent)
        {
            session.Status = ClassSessionStatus.Completed;
            session.UpdatedAtUtc = now;
            await _batchRepository.UpdateSessionAsync(session, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
