using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Services;

public class TutorOnboardingService : ITutorOnboardingService
{
    private readonly IUserAccountRepository _userAccountRepository;
    private readonly ITutorProfileRepository _tutorProfileRepository;
    private readonly IMessagePublisher _messagePublisher;
    private readonly IUnitOfWork _unitOfWork;

    public TutorOnboardingService(
        IUserAccountRepository userAccountRepository,
        ITutorProfileRepository tutorProfileRepository,
        IMessagePublisher messagePublisher,
        IUnitOfWork unitOfWork)
    {
        _userAccountRepository = userAccountRepository;
        _tutorProfileRepository = tutorProfileRepository;
        _messagePublisher = messagePublisher;
        _unitOfWork = unitOfWork;
    }

    public async Task<TutorProfileResponse> UpsertTutorProfileAsync(
        string authUserId,
        string authenticatedEmail,
        TutorOnboardingRequest request,
        CancellationToken cancellationToken)
    {
        var jwtEmail = NormalizeEmail(authenticatedEmail);
        var normalizedFullName = NormalizeValue(request.FullName);
        var normalizedPhone = NormalizeValue(request.PhoneNumber);

        // Email is always taken from the authenticated session (JWT), never from stale browser drafts.
        var normalizedEmail = !string.IsNullOrWhiteSpace(jwtEmail)
            ? jwtEmail
            : NormalizeEmail(request.Email);

        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            throw new InvalidOperationException("Authenticated email is required to save a tutor profile.");
        }

        var userAccount = await _userAccountRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);

        if (userAccount == null)
        {
            userAccount = new UserAccount
            {
                Id = Guid.NewGuid(),
                AuthUserId = authUserId,
                FullName = normalizedFullName,
                Email = normalizedEmail,
                PhoneNumber = normalizedPhone,
                Role = PlatformUserRole.Tutor,
                CreatedAtUtc = DateTime.UtcNow
            };
            await _userAccountRepository.AddAsync(userAccount, cancellationToken);
        }
        else
        {
            userAccount.FullName = normalizedFullName;
            userAccount.Email = normalizedEmail;
            userAccount.PhoneNumber = normalizedPhone;
            if (userAccount.Role != PlatformUserRole.SuperAdmin)
            {
                userAccount.Role = PlatformUserRole.Tutor;
            }
            await _userAccountRepository.UpdateAsync(userAccount, cancellationToken);
        }

        var profile = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
        if (profile == null)
        {
            profile = new TutorProfile
            {
                Id = Guid.NewGuid(),
                UserAccountId = userAccount.Id,
                CreatedAtUtc = DateTime.UtcNow,
                VerificationStatus = TutorVerificationStatus.Pending
            };
            Map(profile, request);
            await _tutorProfileRepository.AddAsync(profile, cancellationToken);
        }
        else
        {
            Map(profile, request);
            if (profile.VerificationStatus != TutorVerificationStatus.Approved)
            {
                profile.VerificationStatus = TutorVerificationStatus.Pending;
            }
            await _tutorProfileRepository.UpdateAsync(profile, cancellationToken);
        }

        profile.ProfileCompleteness = profile.CalculateProfileCompleteness();

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _messagePublisher.PublishUserProfileCreatedAsync(userAccount.AuthUserId, userAccount.Email, userAccount.FullName, cancellationToken);

        if (profile.VerificationStatus == TutorVerificationStatus.Approved)
        {
            await _messagePublisher.PublishTutorReviewedAsync(
                profile.Id,
                userAccount.AuthUserId,
                userAccount.FullName,
                userAccount.Email,
                profile.VerificationStatus.ToString(),
                profile.ProfilePhotoUrl,
                profile.HighestDegree,
                profile.YearsOfExperience,
                profile.HourlyFee,
                profile.SubjectsCsv,
                profile.Bio,
                profile.TeachingMethodology,
                profile.TeachingMode.ToString(),
                profile.InPersonLocation,
                profile.ReviewedAtUtc,
                cancellationToken);
        }

        return ToResponse(profile, userAccount);
    }

    public async Task<TutorProfileResponse?> GetTutorProfileAsync(string authUserId, CancellationToken cancellationToken)
    {
        var profile = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken);
        if (profile == null)
        {
            return null;
        }

        var user = profile.UserAccount;
        return ToResponse(profile, user);
    }

    public async Task<TutorProfileResponse?> GetTutorProfileByEmailAsync(string email, CancellationToken cancellationToken)
    {
        var user = await _userAccountRepository.GetByEmailAsync(email, cancellationToken);
        if (user == null)
        {
            return null;
        }

        var profile = await _tutorProfileRepository.GetByAuthUserIdAsync(user.AuthUserId, cancellationToken);
        if (profile == null)
        {
            return null;
        }

        return ToResponse(profile, user);
    }

    private static void Map(TutorProfile profile, TutorOnboardingRequest request)
    {
        profile.ProfilePhotoUrl = request.ProfilePhotoUrl;
        profile.HighestDegree = request.HighestDegree;
        profile.FieldOfStudy = request.FieldOfStudy;
        profile.InstitutionName = request.InstitutionName;
        profile.GraduationYear = request.GraduationYear;
        profile.DegreeCertificateUrl = request.DegreeCertificateUrl;
        profile.SubjectsCsv = ToCsv(request.Subjects);
        profile.GradeLevelsCsv = ToCsv(request.GradeLevels);
        profile.YearsOfExperience = request.YearsOfExperience;
        profile.LanguagesCsv = ToCsv(request.Languages);
        profile.TeachingMode = ParseTeachingMode(request.TeachingMode);
        profile.InPersonLocation = request.InPersonLocation;
        profile.HourlyFee = request.HourlyFee;
        profile.MonthlyFee = request.MonthlyFee;
        profile.AvailableDaysCsv = ToCsv(request.AvailableDays);
        profile.AvailableTimeSlotsCsv = ToCsv(request.AvailableTimeSlots);
        profile.UnavailableDatesCsv = ToCsv(request.UnavailableDates);
        profile.Bio = request.Bio;
        profile.TeachingMethodology = request.TeachingMethodology;
        profile.Achievements = request.Achievements;
        profile.GovernmentIdType = ParseIdType(request.GovernmentIdType);
        profile.GovernmentIdDocumentUrl = request.GovernmentIdDocumentUrl;
        profile.BackgroundCheckConsent = request.BackgroundCheckConsent;
        profile.TeachingLicensesOrCertificatesUrl = request.TeachingLicensesOrCertificatesUrl;
        profile.TermsAccepted = request.TermsAccepted;
        profile.PrivacyAccepted = request.PrivacyAccepted;
        profile.CommissionPolicyAccepted = request.CommissionPolicyAccepted;
        profile.ProfileCompleteness = profile.CalculateProfileCompleteness();
        profile.UpdatedAtUtc = DateTime.UtcNow;
    }

    private static TutorProfileResponse ToResponse(TutorProfile profile, UserAccount user)
    {
        return new TutorProfileResponse
        {
            Id = profile.Id,
            TutorProfileId = profile.Id,
            AuthUserId = user.AuthUserId,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber ?? string.Empty,
            Bio = profile.Bio,
            HourlyFee = profile.HourlyFee,
            MonthlyFee = profile.MonthlyFee,
            HighestDegree = profile.HighestDegree,
            FieldOfStudy = profile.FieldOfStudy,
            InstitutionName = profile.InstitutionName,
            GraduationYear = profile.GraduationYear,
            YearsOfExperience = profile.YearsOfExperience,
            TeachingMode = profile.TeachingMode.ToString(),
            InPersonLocation = profile.InPersonLocation,
            TeachingMethodology = profile.TeachingMethodology,
            Achievements = profile.Achievements,
            Subjects = profile.SubjectsCsv?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
            GradeLevels = profile.GradeLevelsCsv?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
            Languages = profile.LanguagesCsv?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
            AvailableDays = profile.AvailableDaysCsv?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
            AvailableTimeSlots = profile.AvailableTimeSlotsCsv?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
            UnavailableDates = profile.UnavailableDatesCsv?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
            ProfilePhotoUrl = profile.ProfilePhotoUrl,
            DegreeCertificateUrl = profile.DegreeCertificateUrl,
            GovernmentIdType = profile.GovernmentIdType.ToString(),
            GovernmentIdDocumentUrl = profile.GovernmentIdDocumentUrl,
            TeachingLicensesOrCertificatesUrl = profile.TeachingLicensesOrCertificatesUrl,
            BackgroundCheckConsent = profile.BackgroundCheckConsent,
            TermsAccepted = profile.TermsAccepted,
            PrivacyAccepted = profile.PrivacyAccepted,
            CommissionPolicyAccepted = profile.CommissionPolicyAccepted,
            VerificationStatus = profile.VerificationStatus.ToString(),
            ProfileCompleteness = profile.ProfileCompleteness,
            VerificationNotes = profile.VerificationNotes,
            ReviewedAtUtc = profile.ReviewedAtUtc
        };
    }


    private static string ToCsv(IEnumerable<string> values) =>
        string.Join(',', values.Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value.Trim()));

    private static string NormalizeEmail(string value) =>
        string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim().ToLowerInvariant();

    private static string NormalizeValue(string value) =>
        string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();

    private static TeachingMode ParseTeachingMode(string value)
    {
        return value.Trim().ToUpperInvariant() switch
        {
            "ONLINE" => TeachingMode.Online,
            "INPERSON" => TeachingMode.InPerson,
            "IN_PERSON" => TeachingMode.InPerson,
            "BOTH" => TeachingMode.Both,
            _ => TeachingMode.Online
        };
    }

    private static GovernmentIdType ParseIdType(string value)
    {
        return value.Trim().ToUpperInvariant() switch
        {
            "CNIC" => GovernmentIdType.Cnic,
            "PASSPORT" => GovernmentIdType.Passport,
            "DRIVINGLICENSE" => GovernmentIdType.DrivingLicense,
            "DRIVING_LICENSE" => GovernmentIdType.DrivingLicense,
            _ => GovernmentIdType.Other
        };
    }
}
