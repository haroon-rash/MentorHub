using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Helpers;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Services;

public class ReviewService : IReviewService
{
    private readonly IReviewRepository _reviewRepository;
    private readonly IStudentProfileRepository _studentProfileRepository;
    private readonly ITutorProfileRepository _tutorProfileRepository;
    private readonly IBookingRepository _bookingRepository;
    private readonly INotificationService _notificationService;
    private readonly IUnitOfWork _unitOfWork;

    public ReviewService(
        IReviewRepository reviewRepository,
        IStudentProfileRepository studentProfileRepository,
        ITutorProfileRepository tutorProfileRepository,
        IBookingRepository bookingRepository,
        INotificationService notificationService,
        IUnitOfWork unitOfWork)
    {
        _reviewRepository = reviewRepository;
        _studentProfileRepository = studentProfileRepository;
        _tutorProfileRepository = tutorProfileRepository;
        _bookingRepository = bookingRepository;
        _notificationService = notificationService;
        _unitOfWork = unitOfWork;
    }

    public async Task<ReviewResponse> CreateReviewAsync(string studentAuthUserId, CreateReviewRequest request, CancellationToken cancellationToken)
    {
        if (request.Rating is < 1 or > 5)
            throw new InvalidOperationException("Rating must be between 1 and 5.");

        var student = await _studentProfileRepository.GetByAuthUserIdAsync(studentAuthUserId, cancellationToken)
            ?? throw new InvalidOperationException("Student profile not found.");

        var tutor = await _tutorProfileRepository.GetByIdAsync(request.TutorProfileId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor not found.");

        DualRoleValidationHelper.EnsureNotSelfReview(student, tutor);

        var booking = await _bookingRepository.GetByIdAsync(request.BookingId, cancellationToken)
            ?? throw new InvalidOperationException("Booking not found.");

        if (booking.StudentProfileId != student.Id)
            throw new UnauthorizedAccessException("This booking does not belong to you.");

        var hasCompletedBooking = await _bookingRepository.HasCompletedBookingAsync(student.Id, tutor.Id, cancellationToken);
        if (!hasCompletedBooking)
            throw new InvalidOperationException("You can only review a tutor after a completed booking.");

        if (booking.Status != BookingStatus.Completed)
            throw new InvalidOperationException("You can only review completed sessions.");

        var alreadyReviewed = await _reviewRepository.ExistsForBookingAsync(request.BookingId, cancellationToken);
        if (alreadyReviewed)
            throw new InvalidOperationException("You have already reviewed this session.");

        var review = new Review
        {
            Id = Guid.NewGuid(),
            StudentProfileId = student.Id,
            TutorProfileId = tutor.Id,
            BookingId = request.BookingId,
            ReviewType = ReviewType.Booking,
            Rating = request.Rating,
            Comment = request.Comment.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        await _reviewRepository.AddAsync(review, cancellationToken);

        // Recalculate tutor's average rating
        var allReviews = await _reviewRepository.GetByTutorIdAsync(tutor.Id, cancellationToken);
        var allRatings = allReviews.Select(r => r.Rating).Append(request.Rating).ToList();
        tutor.AverageRating = Math.Round(allRatings.Average(), 1);
        tutor.ReviewCount = allRatings.Count;
        await _tutorProfileRepository.UpdateAsync(tutor, cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Notify tutor
        await _notificationService.CreateAsync(
            tutor.UserAccount.AuthUserId,
            NotificationType.ReviewReceived,
            "New Review Received ⭐",
            $"{student.UserAccount.FullName} gave you {request.Rating}/5 stars: \"{request.Comment.Substring(0, Math.Min(60, request.Comment.Length))}...\"",
            review.Id,
            cancellationToken);

        return new ReviewResponse
        {
            Id = review.Id,
            BookingId = review.BookingId,
            StudentName = student.UserAccount.FullName,
            StudentPhotoUrl = student.ProfilePhotoUrl,
            Rating = review.Rating,
            Comment = review.Comment,
            CreatedAtUtc = review.CreatedAtUtc
        };
    }

    public async Task<IReadOnlyCollection<ReviewResponse>> GetTutorReviewsAsync(Guid tutorProfileId, CancellationToken cancellationToken)
    {
        var reviews = await _reviewRepository.GetByTutorIdAsync(tutorProfileId, cancellationToken);
        return reviews.Select(r => new ReviewResponse
        {
            Id = r.Id,
            BookingId = r.BookingId,
            StudentName = r.StudentProfile?.UserAccount?.FullName ?? "Anonymous",
            StudentPhotoUrl = r.StudentProfile?.ProfilePhotoUrl,
            Rating = r.Rating,
            Comment = r.Comment,
            CreatedAtUtc = r.CreatedAtUtc
        }).ToArray();
    }
}
