using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Helpers;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;

namespace UserManagment.Application.Services;

public class StudyMaterialService : IStudyMaterialService
{
    private readonly IStudyMaterialRepository _repository;
    private readonly ITutorProfileRepository _tutorProfileRepository;
    private readonly ITutorBatchRepository _batchRepository;
    private readonly IStudentProfileRepository _studentProfileRepository;
    private readonly IUnitOfWork _unitOfWork;

    public StudyMaterialService(
        IStudyMaterialRepository repository,
        ITutorProfileRepository tutorProfileRepository,
        ITutorBatchRepository batchRepository,
        IStudentProfileRepository studentProfileRepository,
        IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _tutorProfileRepository = tutorProfileRepository;
        _batchRepository = batchRepository;
        _studentProfileRepository = studentProfileRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<StudyMaterialResponse> CreateAsync(
        string authUserId, CreateStudyMaterialRequest request, CancellationToken cancellationToken)
    {
        var tutor = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor profile not found.");

        TutorSubjectValidator.EnsureSubjectAllowed(tutor, request.Subject);

        if (request.TutorBatchId.HasValue)
        {
            var batch = await _batchRepository.GetByIdAsync(request.TutorBatchId.Value, cancellationToken)
                ?? throw new InvalidOperationException("Batch not found.");
            if (batch.TutorProfileId != tutor.Id)
            {
                throw new InvalidOperationException("You can only attach materials to your own batches.");
            }

            if (!string.Equals(batch.Subject, request.Subject.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Material subject must match the selected batch subject.");
            }
        }

        if (string.IsNullOrWhiteSpace(request.FileUrlsCsv))
        {
            throw new InvalidOperationException("Upload at least one file.");
        }

        var material = new StudyMaterial
        {
            Id = Guid.NewGuid(),
            TutorProfileId = tutor.Id,
            TutorBatchId = request.TutorBatchId,
            Subject = request.Subject.Trim(),
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Topic = request.Topic?.Trim(),
            Module = request.Module?.Trim(),
            Chapter = request.Chapter?.Trim(),
            TagsCsv = request.TagsCsv?.Trim(),
            FileUrlsCsv = request.FileUrlsCsv.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow,
        };

        await _repository.AddAsync(material, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        material.TutorProfile = tutor;
        return MapMaterial(material);
    }

    public async Task<StudyMaterialResponse> UpdateAsync(
        string authUserId, Guid materialId, UpdateStudyMaterialRequest request, CancellationToken cancellationToken)
    {
        var tutor = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor profile not found.");
        var material = await _repository.GetByIdAsync(materialId, cancellationToken)
            ?? throw new InvalidOperationException("Study material not found.");

        if (material.TutorProfileId != tutor.Id)
        {
            throw new InvalidOperationException("Not authorized.");
        }

        TutorSubjectValidator.EnsureSubjectAllowed(tutor, request.Subject);
        material.Subject = request.Subject.Trim();
        material.Title = request.Title.Trim();
        material.Description = request.Description?.Trim();
        material.Topic = request.Topic?.Trim();
        material.Module = request.Module?.Trim();
        material.Chapter = request.Chapter?.Trim();
        material.TagsCsv = request.TagsCsv?.Trim();
        material.FileUrlsCsv = request.FileUrlsCsv.Trim();
        material.TutorBatchId = request.TutorBatchId;
        material.UpdatedAtUtc = DateTime.UtcNow;

        await _repository.UpdateAsync(material, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapMaterial(material);
    }

    public async Task DeleteAsync(string authUserId, Guid materialId, CancellationToken cancellationToken)
    {
        var tutor = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor profile not found.");
        var material = await _repository.GetByIdAsync(materialId, cancellationToken)
            ?? throw new InvalidOperationException("Study material not found.");

        if (material.TutorProfileId != tutor.Id)
        {
            throw new InvalidOperationException("Not authorized.");
        }

        material.IsDeleted = true;
        material.UpdatedAtUtc = DateTime.UtcNow;
        await _repository.UpdateAsync(material, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<StudyMaterialResponse>> GetForTutorAsync(string authUserId, CancellationToken cancellationToken)
    {
        var tutor = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor profile not found.");
        var items = await _repository.GetByTutorAsync(tutor.Id, cancellationToken);
        return items.Select(MapMaterial).ToArray();
    }

    public async Task<IReadOnlyCollection<StudyMaterialResponse>> GetForStudentAsync(string authUserId, CancellationToken cancellationToken)
    {
        var student = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Student profile not found.");
        var items = await _repository.GetForStudentAsync(student.Id, cancellationToken);
        return items.Select(MapMaterial).ToArray();
    }

    private static StudyMaterialResponse MapMaterial(StudyMaterial m) => new()
    {
        Id = m.Id,
        TutorBatchId = m.TutorBatchId,
        BatchTitle = m.TutorBatch?.Title,
        Subject = m.Subject,
        Title = m.Title,
        Description = m.Description,
        Topic = m.Topic,
        Module = m.Module,
        Chapter = m.Chapter,
        TagsCsv = m.TagsCsv,
        FileUrlsCsv = m.FileUrlsCsv,
        TutorName = m.TutorProfile?.UserAccount?.FullName ?? string.Empty,
        CreatedAtUtc = m.CreatedAtUtc,
    };
}
