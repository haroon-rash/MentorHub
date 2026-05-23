using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Services;

public class StudentOnboardingService : IStudentOnboardingService
{
    private readonly IUserAccountRepository _userAccountRepository;
    private readonly IStudentProfileRepository _studentProfileRepository;
    private readonly IMessagePublisher _messagePublisher;
    private readonly IUnitOfWork _unitOfWork;

    public StudentOnboardingService(
        IUserAccountRepository userAccountRepository,
        IStudentProfileRepository studentProfileRepository,
        IMessagePublisher messagePublisher,
        IUnitOfWork unitOfWork)
    {
        _userAccountRepository = userAccountRepository;
        _studentProfileRepository = studentProfileRepository;
        _messagePublisher = messagePublisher;
        _unitOfWork = unitOfWork;
    }

    public async Task<StudentProfileResponse> UpsertStudentProfileAsync(string authUserId, StudentOnboardingRequest request, CancellationToken cancellationToken)
    {
        request.Subjects ??= new List<string>();
        request.Interests ??= new List<string>();
        request.PreferredDays ??= new List<string>();
        request.PreferredTimeSlots ??= new List<string>();

        var userAccount = await _userAccountRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
        if (userAccount == null)
        {
            userAccount = new UserAccount
            {
                Id = Guid.NewGuid(),
                AuthUserId = authUserId,
                FullName = request.FullName,
                Email = request.Email,
                PhoneNumber = request.PhoneNumber,
                Role = PlatformUserRole.Student,
                CreatedAtUtc = DateTime.UtcNow
            };
            await _userAccountRepository.AddAsync(userAccount, cancellationToken);
        }
        else
        {
            userAccount.FullName = request.FullName;
            userAccount.Email = request.Email;
            userAccount.PhoneNumber = request.PhoneNumber;
            await _userAccountRepository.UpdateAsync(userAccount, cancellationToken);
        }

        var profile = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
        if (profile == null)
        {
            profile = new StudentProfile
            {
                Id = Guid.NewGuid(),
                UserAccountId = userAccount.Id,
                CreatedAtUtc = DateTime.UtcNow
            };
            Map(profile, request);
            await _studentProfileRepository.AddAsync(profile, cancellationToken);
        }
        else
        {
            Map(profile, request);
            await _studentProfileRepository.UpdateAsync(profile, cancellationToken);
        }

        profile.ProfileCompleteness = profile.CalculateProfileCompleteness();

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _messagePublisher.PublishUserProfileCreatedAsync(userAccount.AuthUserId, userAccount.Email, userAccount.FullName, cancellationToken);

        return ToResponse(profile, userAccount);
    }

    public async Task<StudentProfileResponse?> GetStudentProfileAsync(string authUserId, CancellationToken cancellationToken)
    {
        var profile = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
        if (profile == null)
        {
            return null;
        }

        return ToResponse(profile, profile.UserAccount);
    }

    private static void Map(StudentProfile profile, StudentOnboardingRequest request)
    {
        profile.ProfilePhotoUrl = request.ProfilePhotoUrl ?? string.Empty;
        profile.DateOfBirth = request.DateOfBirth == default
            ? null
            : NormalizeUtc(request.DateOfBirth);
        profile.Gender = request.Gender;
        profile.CityOrArea = request.CityOrArea;

        profile.EducationLevel = request.EducationLevel;
        profile.CurrentGradeOrYear = request.CurrentGradeOrYear;
        profile.SchoolOrInstitutionName = request.SchoolOrInstitutionName;
        profile.MediumOfEducation = request.MediumOfEducation;

        profile.SubjectsCsv = ToCsv(request.Subjects);
        profile.InterestsCsv = ToCsv(request.Interests);
        profile.TopicsOfDifficulty = request.TopicsOfDifficulty;
        profile.TutoringPurpose = request.TutoringPurpose;
        profile.LearningGoalsOrTargetGrade = request.LearningGoalsOrTargetGrade;

        profile.PreferredMode = request.PreferredMode;
        profile.PreferredDaysCsv = ToCsv(request.PreferredDays);
        profile.PreferredTimeSlotsCsv = ToCsv(request.PreferredTimeSlots);
        profile.BudgetPerSession = request.BudgetPerSession;
        profile.BudgetPerMonth = request.BudgetPerMonth;
        profile.PreferredTutorGender = request.PreferredTutorGender;
        profile.PreferredLanguageOfInstruction = request.PreferredLanguageOfInstruction;

        profile.GuardianFullName = request.GuardianFullName;
        profile.GuardianContactNumber = request.GuardianContactNumber;
        profile.GuardianEmailAddress = request.GuardianEmailAddress;
        profile.GuardianRelationship = request.GuardianRelationship;
        profile.GuardianConsentAcknowledgment = request.GuardianConsentAcknowledgment;

        profile.TermsAccepted = request.TermsAccepted;
        profile.PrivacyAccepted = request.PrivacyAccepted;
        profile.ProfileCompleteness = profile.CalculateProfileCompleteness();
        profile.UpdatedAtUtc = DateTime.UtcNow;
    }

    private static DateTime NormalizeUtc(DateTime value)
    {
        if (value.Kind == DateTimeKind.Utc)
        {
            return value;
        }

        if (value.Kind == DateTimeKind.Local)
        {
            return value.ToUniversalTime();
        }

        return DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }

    private static StudentProfileResponse ToResponse(StudentProfile profile, UserAccount user)
    {
        return new StudentProfileResponse
        {
            StudentProfileId = profile.Id,
            AuthUserId = user.AuthUserId,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber ?? string.Empty,
            ProfilePhotoUrl = profile.ProfilePhotoUrl,
            DateOfBirth = profile.DateOfBirth,
            Gender = profile.Gender,
            CityOrArea = profile.CityOrArea,
            EducationLevel = profile.EducationLevel,
            CurrentGradeOrYear = profile.CurrentGradeOrYear,
            SchoolOrInstitutionName = profile.SchoolOrInstitutionName,
            MediumOfEducation = profile.MediumOfEducation,
            Subjects = ToArray(profile.SubjectsCsv),
            Interests = ToArray(profile.InterestsCsv),
            TopicsOfDifficulty = profile.TopicsOfDifficulty,
            TutoringPurpose = profile.TutoringPurpose,
            LearningGoalsOrTargetGrade = profile.LearningGoalsOrTargetGrade,
            PreferredMode = profile.PreferredMode,
            PreferredDays = ToArray(profile.PreferredDaysCsv),
            PreferredTimeSlots = ToArray(profile.PreferredTimeSlotsCsv),
            BudgetPerSession = profile.BudgetPerSession,
            BudgetPerMonth = profile.BudgetPerMonth,
            PreferredTutorGender = profile.PreferredTutorGender,
            PreferredLanguageOfInstruction = profile.PreferredLanguageOfInstruction,
            GuardianFullName = profile.GuardianFullName,
            GuardianContactNumber = profile.GuardianContactNumber,
            GuardianEmailAddress = profile.GuardianEmailAddress,
            GuardianRelationship = profile.GuardianRelationship,
            GuardianConsentAcknowledgment = profile.GuardianConsentAcknowledgment,
            TermsAccepted = profile.TermsAccepted,
            PrivacyAccepted = profile.PrivacyAccepted,
            IsMinor = profile.IsMinor(),
            ProfileCompleteness = profile.ProfileCompleteness
        };
    }

    private static string ToCsv(IEnumerable<string>? values) =>
        string.Join(',', (values ?? Enumerable.Empty<string>()).Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value.Trim()));

    private static string[] ToArray(string values) =>
        values
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .ToArray();
}
