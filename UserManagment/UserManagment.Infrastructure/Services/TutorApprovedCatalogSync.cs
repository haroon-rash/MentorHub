using Microsoft.EntityFrameworkCore;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.Infrastructure.Services;

public class TutorApprovedCatalogSync : ITutorApprovedCatalogSync
{
    private readonly UserManagmentDbContext _dbContext;

    public TutorApprovedCatalogSync(UserManagmentDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task SyncAfterReviewAsync(TutorProfile profile, CancellationToken cancellationToken = default)
    {
        if (profile.UserAccount == null)
        {
            await _dbContext.Entry(profile).Reference(p => p.UserAccount).LoadAsync(cancellationToken);
        }

        await _dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM approved_tutors WHERE tutor_profile_id = {profile.Id}",
            cancellationToken);

        if (profile.VerificationStatus != TutorVerificationStatus.Approved)
        {
            return;
        }

        var reviewedAt = profile.ReviewedAtUtc ?? DateTime.UtcNow;
        await _dbContext.Database.ExecuteSqlInterpolatedAsync($@"
            INSERT INTO approved_tutors (
                id, tutor_profile_id, auth_user_id, full_name, email, status,
                profile_photo_url, highest_degree, years_of_experience, hourly_fee,
                subjects_csv, bio, teaching_methodology, teaching_mode, in_person_location,
                average_rating, review_count, reviewed_at_utc, synced_at_utc
            )
            VALUES (
                {Guid.NewGuid()}, {profile.Id}, {profile.UserAccount.AuthUserId},
                {profile.UserAccount.FullName}, {profile.UserAccount.Email}, {"Approved"},
                {profile.ProfilePhotoUrl}, {profile.HighestDegree}, {profile.YearsOfExperience},
                {profile.HourlyFee}, {profile.SubjectsCsv}, {profile.Bio},
                {profile.TeachingMethodology}, {profile.TeachingMode.ToString()},
                {profile.InPersonLocation}, {(decimal)(profile.AverageRating ?? 0)},
                {profile.ReviewCount}, {reviewedAt}, {DateTime.UtcNow}
            )",
            cancellationToken);
    }
}
