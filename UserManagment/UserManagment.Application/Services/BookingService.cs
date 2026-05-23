using UserManagment.Application.Contracts;
using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Helpers;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Constants;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Services;

public class BookingService : IBookingService
{
    private readonly IBookingRepository _bookingRepository;
    private readonly ITutorProfileRepository _tutorProfileRepository;
    private readonly IStudentProfileRepository _studentProfileRepository;
    private readonly IBatchEnrollmentRepository _enrollmentRepository;
    private readonly INotificationService _notificationService;
    private readonly IUnitOfWork _unitOfWork;

    public BookingService(
        IBookingRepository bookingRepository,
        ITutorProfileRepository tutorProfileRepository,
        IStudentProfileRepository studentProfileRepository,
        IBatchEnrollmentRepository enrollmentRepository,
        INotificationService notificationService,
        IUnitOfWork unitOfWork)
    {
        _bookingRepository = bookingRepository;
        _tutorProfileRepository = tutorProfileRepository;
        _studentProfileRepository = studentProfileRepository;
        _enrollmentRepository = enrollmentRepository;
        _notificationService = notificationService;
        _unitOfWork = unitOfWork;
    }

    public async Task<BookingResponse> CreateBookingAsync(string authUserId, CreateBookingRequest request, CancellationToken cancellationToken)
    {
        // Normalize date to UTC midnight without timezone conversion drift
        var utcDate = request.BookingDate.Kind == DateTimeKind.Unspecified 
            ? new DateTime(request.BookingDate.Year, request.BookingDate.Month, request.BookingDate.Day, 0, 0, 0, DateTimeKind.Utc)
            : new DateTime(request.BookingDate.Year, request.BookingDate.Month, request.BookingDate.Day, 0, 0, 0, DateTimeKind.Utc);
        request.BookingDate = utcDate;
        
        var student = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Student profile not found. Complete onboarding first.");

        student.ProfileCompleteness = student.CalculateProfileCompleteness();
        if (student.ProfileCompleteness < StudentProfileConstants.MinCompletenessForBooking)
        {
            throw new InvalidOperationException(
                $"Your profile is {student.ProfileCompleteness}% complete. Reach at least {StudentProfileConstants.MinCompletenessForBooking}% to book sessions.");
        }

        var tutor = await _tutorProfileRepository.GetByIdAsync(request.TutorProfileId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor not found");

        DualRoleValidationHelper.EnsureNotSelfBooking(student, tutor);

        await _enrollmentRepository.ExpirePastEnrollmentsAsync(cancellationToken);

        var isMonthlyPackage = !string.IsNullOrWhiteSpace(request.BillingPlan) &&
            request.BillingPlan.Equals("monthly", StringComparison.OrdinalIgnoreCase);
        var planMonths = request.PlanMonths ?? 1;
        if (isMonthlyPackage && planMonths >= 1)
        {
            throw new InvalidOperationException(
                "Monthly packages use course enrollment, not single-session booking. " +
                "Please confirm your package on the booking review screen to enroll for the full period.");
        }

        var activeEnrollments = await _enrollmentRepository.GetActiveEnrollmentsWithBatchesAsync(
            student.Id, null, cancellationToken);

        var duplicatePackage = await _enrollmentRepository.GetActiveSameTutorSubjectEnrollmentAsync(
            student.Id, tutor.Id, request.Subject, request.BookingDate, request.BookingDate, null, cancellationToken);
        if (duplicatePackage is not null)
        {
            throw new InvalidOperationException(
                $"You already have an active {duplicatePackage.Subject} package with this tutor until {duplicatePackage.EndDateUtc:dd MMM yyyy}. " +
                "Attend your scheduled classes or wait until the package expires before booking the same subject again.");
        }

        var sessionConflict = EnrollmentValidationHelper.ValidateSingleSessionAgainstEnrollments(
            activeEnrollments, request.BookingDate, request.TimeSlot);
        if (!sessionConflict.CanEnroll)
        {
            throw new InvalidOperationException(sessionConflict.Message ?? "This session time conflicts with one of your active course packages.");
        }

        // Tutor slot conflict
        var tutorBookings = await _bookingRepository.GetByTutorAndDateAsync(tutor.Id, request.BookingDate, cancellationToken);
        var activeTutorBookings = tutorBookings.Where(b => b.Status != BookingStatus.Cancelled).ToList();
        if (activeTutorBookings.Any(b => b.TimeSlot == request.TimeSlot))
        {
            throw new InvalidOperationException("This time slot has already been booked. Please choose another one.");
        }

        foreach (var existing in activeTutorBookings)
        {
            if (BookingTimeSlotHelper.Overlaps(request.TimeSlot, request.BookingDate, existing.TimeSlot, existing.BookingDate))
            {
                throw new InvalidOperationException("This time overlaps with another booking for this tutor. Please choose another slot.");
            }
        }

        // Student cannot book overlapping sessions (even with different tutors/subjects)
        var studentBookings = await _bookingRepository.GetByStudentAndDateAsync(student.Id, request.BookingDate, cancellationToken);
        foreach (var existing in studentBookings.Where(b => b.Status != BookingStatus.Cancelled))
        {
            if (BookingTimeSlotHelper.Overlaps(request.TimeSlot, request.BookingDate, existing.TimeSlot, existing.BookingDate))
            {
                throw new InvalidOperationException(
                    "You already have a session scheduled during this time. Please choose a non-overlapping slot.");
            }
        }

        var studentNotes = request.StudentNotes;
        if (!string.IsNullOrWhiteSpace(request.BillingPlan))
        {
            var billingTag = request.BillingPlan.Equals("hourly", StringComparison.OrdinalIgnoreCase)
                ? "Billing: hourly (per session)"
                : $"Billing: monthly ({request.PlanMonths ?? 1} month(s))";
            studentNotes = string.IsNullOrWhiteSpace(studentNotes)
                ? billingTag
                : $"{studentNotes}\n\n{billingTag}";
        }

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            StudentProfileId = student.Id,
            TutorProfileId = tutor.Id,
            BookingDate = request.BookingDate,
            TimeSlot = request.TimeSlot,
            SessionMode = request.SessionMode,
            Subject = request.Subject,
            Fee = tutor.HourlyFee,
            Status = BookingStatus.Pending,
            StudentNotes = studentNotes,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        try
        {
            await _bookingRepository.AddAsync(booking, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex) when (ex.ToString().Contains("idx_bookings_prevent_double") || ex.ToString().Contains("duplicate key"))
        {
            // Catch unique index violation without directly depending on EF Core/Npgsql
            throw new InvalidOperationException("This time slot was just booked by someone else. Please choose another slot.");
        }

        // Notify tutor of new booking request
        await _notificationService.CreateAsync(
            tutor.UserAccount.AuthUserId,
            NotificationType.BookingRequested,
            "New Booking Request",
            $"{student.UserAccount.FullName} requested a {request.Subject} session on {request.BookingDate:MMM dd, yyyy} at {request.TimeSlot}.",
            booking.Id,
            cancellationToken,
            new NotificationDeliveryMetadata
            {
                ActionPath = "/tutor/teaching",
            });

        return MapToResponse(booking);
    }

    public async Task<BookingResponse> ConfirmBookingAsync(string tutorAuthUserId, Guid bookingId, CancellationToken cancellationToken)
    {
        var booking = await _bookingRepository.GetByIdAsync(bookingId, cancellationToken)
            ?? throw new InvalidOperationException("Booking not found.");

        if (booking.TutorProfile.UserAccount.AuthUserId != tutorAuthUserId)
            throw new UnauthorizedAccessException("You are not authorized to confirm this booking.");

        if (booking.Status != BookingStatus.Pending)
            throw new InvalidOperationException($"Cannot confirm a booking in '{booking.Status}' status.");

        // Generate Jitsi meeting link
        var meetingLink = $"https://meet.jit.si/mentorhub-{bookingId:N}";

        booking.Status = BookingStatus.Confirmed;
        booking.MeetingLink = meetingLink;
        booking.UpdatedAtUtc = DateTime.UtcNow;

        await _bookingRepository.UpdateAsync(booking, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Notify student
        await _notificationService.CreateAsync(
            booking.StudentProfile.UserAccount.AuthUserId,
            NotificationType.BookingConfirmed,
            "Booking Confirmed! 🎉",
            $"Your {booking.Subject} session with {booking.TutorProfile.UserAccount.FullName} on {booking.BookingDate:MMM dd, yyyy} at {booking.TimeSlot} is confirmed. Join link is ready!",
            bookingId,
            cancellationToken,
            new NotificationDeliveryMetadata
            {
                ActionPath = "/student/enrollments",
            });

        return MapToResponse(booking);
    }

    public async Task<BookingResponse> CancelBookingAsync(string authUserId, Guid bookingId, string? reason, CancellationToken cancellationToken)
    {
        var booking = await _bookingRepository.GetByIdAsync(bookingId, cancellationToken)
            ?? throw new InvalidOperationException("Booking not found.");

        var isTutor = booking.TutorProfile.UserAccount.AuthUserId == authUserId;
        var isStudent = booking.StudentProfile.UserAccount.AuthUserId == authUserId;

        if (!isTutor && !isStudent)
            throw new UnauthorizedAccessException("You are not authorized to cancel this booking.");

        if (booking.Status == BookingStatus.Completed || booking.Status == BookingStatus.Cancelled)
            throw new InvalidOperationException($"Cannot cancel a booking in '{booking.Status}' status.");

        booking.Status = BookingStatus.Cancelled;
        booking.CancellationReason = reason;
        booking.CancelledBy = isTutor ? "tutor" : "student";
        booking.UpdatedAtUtc = DateTime.UtcNow;

        await _bookingRepository.UpdateAsync(booking, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Notify the other party
        var recipientAuthUserId = isTutor
            ? booking.StudentProfile.UserAccount.AuthUserId
            : booking.TutorProfile.UserAccount.AuthUserId;

        var cancellerName = isTutor
            ? booking.TutorProfile.UserAccount.FullName
            : booking.StudentProfile.UserAccount.FullName;

        await _notificationService.CreateAsync(
            recipientAuthUserId,
            NotificationType.BookingCancelled,
            "Booking Cancelled",
            $"Your {booking.Subject} session on {booking.BookingDate:MMM dd, yyyy} at {booking.TimeSlot} was cancelled by {cancellerName}." +
            (string.IsNullOrWhiteSpace(reason) ? "" : $" Reason: {reason}"),
            bookingId,
            cancellationToken);

        return MapToResponse(booking);
    }

    public async Task<BookingResponse> CompleteBookingAsync(string tutorAuthUserId, Guid bookingId, string? tutorNotes, CancellationToken cancellationToken)
    {
        var booking = await _bookingRepository.GetByIdAsync(bookingId, cancellationToken)
            ?? throw new InvalidOperationException("Booking not found.");

        if (booking.TutorProfile.UserAccount.AuthUserId != tutorAuthUserId)
            throw new UnauthorizedAccessException("You are not authorized to complete this booking.");

        if (booking.Status != BookingStatus.Confirmed)
            throw new InvalidOperationException($"Cannot complete a booking in '{booking.Status}' status.");

        booking.Status = BookingStatus.Completed;
        booking.TutorNotes = tutorNotes;
        booking.UpdatedAtUtc = DateTime.UtcNow;

        await _bookingRepository.UpdateAsync(booking, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Notify student — prompt for review
        await _notificationService.CreateAsync(
            booking.StudentProfile.UserAccount.AuthUserId,
            NotificationType.BookingCompleted,
            "Session Complete — Leave a Review!",
            $"Your {booking.Subject} session with {booking.TutorProfile.UserAccount.FullName} is marked complete. How was it? Leave a review!",
            bookingId,
            cancellationToken);

        return MapToResponse(booking);
    }

    public async Task<IReadOnlyCollection<string>> GetBookedSlotsAsync(Guid tutorId, DateTime date, CancellationToken cancellationToken)
    {
        var bookings = await _bookingRepository.GetByTutorAndDateAsync(tutorId, date, cancellationToken);
        return bookings
            .Where(b => b.Status != BookingStatus.Cancelled)
            .Select(b => b.TimeSlot)
            .ToArray();
    }

    public async Task<IReadOnlyCollection<BookingResponse>> GetStudentBookingsAsync(string authUserId, CancellationToken cancellationToken)
    {
        var student = await _studentProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Student profile not found");

        var bookings = await _bookingRepository.GetByStudentIdAsync(student.Id, cancellationToken);
        return bookings.Select(MapToResponse).ToArray();
    }

    public async Task<IReadOnlyCollection<BookingResponse>> GetTutorBookingsAsync(string authUserId, CancellationToken cancellationToken)
    {
        var tutor = await _tutorProfileRepository.GetByAuthUserIdAsync(authUserId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor profile not found");

        var bookings = await _bookingRepository.GetByTutorIdAsync(tutor.Id, cancellationToken);
        return bookings.Select(MapToResponse).ToArray();
    }

    public async Task<TutorDashboardStatsResponse> GetTutorDashboardStatsAsync(string tutorAuthUserId, CancellationToken cancellationToken)
    {
        var tutor = await _tutorProfileRepository.GetByAuthUserIdAsync(tutorAuthUserId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor profile not found");

        var allBookings = await _bookingRepository.GetByTutorIdAsync(tutor.Id, cancellationToken);
        await _enrollmentRepository.ExpirePastEnrollmentsAsync(cancellationToken);
        var enrollments = await _enrollmentRepository.GetByTutorAsync(tutor.Id, cancellationToken);

        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var endOfMonth = startOfMonth.AddMonths(1);

        static bool CountsTowardEarnings(BookingStatus status) =>
            status is BookingStatus.Pending or BookingStatus.Confirmed or BookingStatus.Completed;

        static bool EnrollmentCountsTowardEarnings(BatchEnrollmentStatus status) =>
            status is not BatchEnrollmentStatus.Cancelled;

        var revenueBookings = allBookings.Where(b => CountsTowardEarnings(b.Status)).ToList();
        var revenueEnrollments = enrollments.Where(e => EnrollmentCountsTowardEarnings(e.Status)).ToList();

        var bookingEarningsLifetime = revenueBookings.Sum(b => b.Fee);
        var enrollmentEarningsLifetime = revenueEnrollments.Sum(e => e.AmountPaid);

        var bookingEarningsMonth = revenueBookings
            .Where(b => b.BookingDate >= startOfMonth && b.BookingDate < endOfMonth)
            .Sum(b => b.Fee);
        var enrollmentEarningsMonth = revenueEnrollments
            .Where(e => e.CreatedAtUtc >= startOfMonth && e.CreatedAtUtc < endOfMonth)
            .Sum(e => e.AmountPaid);

        var sessionsThisMonth = allBookings.Count(b =>
            (b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.Completed)
            && b.BookingDate >= startOfMonth
            && b.BookingDate < endOfMonth);

        var completed = allBookings.Where(b => b.Status == BookingStatus.Completed).ToList();

        var todayStart = new DateTime(now.Year, now.Month, now.Day, 0, 0, 0, DateTimeKind.Utc);
        var upcoming = allBookings
            .Where(b => b.Status == BookingStatus.Confirmed && b.BookingDate >= todayStart)
            .OrderBy(b => b.BookingDate)
            .Take(5)
            .Select(MapToResponse)
            .ToArray();

        var pendingRequests = allBookings
            .Where(b => b.Status == BookingStatus.Pending)
            .OrderByDescending(b => b.CreatedAtUtc)
            .Select(MapToResponse)
            .ToArray();

        return new TutorDashboardStatsResponse
        {
            TotalBookings = allBookings.Count,
            PendingBookings = allBookings.Count(b => b.Status == BookingStatus.Pending),
            ConfirmedBookings = allBookings.Count(b => b.Status == BookingStatus.Confirmed),
            CompletedBookings = completed.Count,
            CancelledBookings = allBookings.Count(b => b.Status == BookingStatus.Cancelled),
            TotalEarnings = bookingEarningsLifetime + enrollmentEarningsLifetime,
            EarningsThisMonth = bookingEarningsMonth + enrollmentEarningsMonth,
            SessionsThisMonth = sessionsThisMonth + revenueEnrollments.Count(e =>
                e.CreatedAtUtc >= startOfMonth && e.CreatedAtUtc < endOfMonth),
            UpcomingBookings = upcoming,
            PendingRequests = pendingRequests
        };
    }

    public async Task<IReadOnlyCollection<TutorStudentSummaryResponse>> GetTutorStudentSummariesAsync(
        Guid tutorProfileId,
        string tutorAuthUserId,
        CancellationToken cancellationToken)
    {
        var tutor = await _tutorProfileRepository.GetByAuthUserIdAsync(tutorAuthUserId, cancellationToken)
            ?? throw new InvalidOperationException("Tutor profile not found");

        if (tutor.Id != tutorProfileId)
        {
            throw new UnauthorizedAccessException("You can only view students for your own tutor profile.");
        }

        var bookings = await _bookingRepository.GetByTutorIdAsync(tutor.Id, cancellationToken);
        var active = bookings
            .Where(b => b.Status is BookingStatus.Pending or BookingStatus.Confirmed or BookingStatus.Completed)
            .ToList();

        return active
            .GroupBy(b => b.StudentProfileId)
            .Select(group =>
            {
                var latest = group.OrderByDescending(b => b.BookingDate).ThenByDescending(b => b.CreatedAtUtc).First();
                var student = latest.StudentProfile;
                var account = student?.UserAccount;
                return new TutorStudentSummaryResponse
                {
                    StudentProfileId = group.Key,
                    FullName = account?.FullName ?? "Student",
                    Email = account?.Email ?? string.Empty,
                    PhoneNumber = account?.PhoneNumber,
                    Subject = latest.Subject,
                    Fee = latest.Fee,
                    TimeSlot = latest.TimeSlot,
                    BookingDate = latest.BookingDate,
                    BookingStatus = latest.Status.ToString(),
                    LatestBookingId = latest.Id,
                    TotalSessions = group.Count(),
                };
            })
            .OrderByDescending(s => s.BookingDate)
            .ToArray();
    }

    public async Task<IReadOnlyCollection<StudentTutorSummaryResponse>> GetStudentTutorSummariesAsync(
        string studentAuthUserId,
        CancellationToken cancellationToken)
    {
        var student = await _studentProfileRepository.GetByAuthUserIdAsync(studentAuthUserId, cancellationToken)
            ?? throw new InvalidOperationException("Student profile not found");

        var bookings = await _bookingRepository.GetByStudentIdAsync(student.Id, cancellationToken);
        var active = bookings
            .Where(b => b.Status is BookingStatus.Pending or BookingStatus.Confirmed or BookingStatus.Completed)
            .ToList();

        var summaries = new List<StudentTutorSummaryResponse>();
        foreach (var group in active.GroupBy(b => b.TutorProfileId))
        {
            var latest = group.OrderByDescending(b => b.BookingDate).ThenByDescending(b => b.CreatedAtUtc).First();
            var tutorProfile = latest.TutorProfile;
            var account = tutorProfile?.UserAccount;
            var tutorId = group.Key;
            summaries.Add(new StudentTutorSummaryResponse
            {
                TutorProfileId = tutorId,
                FullName = account?.FullName ?? "Tutor",
                ProfilePhotoUrl = string.IsNullOrWhiteSpace(tutorProfile?.ProfilePhotoUrl)
                    ? null
                    : tutorProfile.ProfilePhotoUrl,
                Subject = latest.Subject,
                HourlyFee = tutorProfile?.HourlyFee ?? latest.Fee,
                AverageRating = tutorProfile?.AverageRating,
                AnnouncementCount = 0,
                UnreadAnnouncementCount = 0,
                BookingStatus = latest.Status.ToString(),
                BookingDate = latest.BookingDate,
                TotalSessions = group.Count(),
            });
        }

        return summaries.OrderByDescending(t => t.BookingDate).ToArray();
    }

    private static string? ResolveLocationOrMeetingInfo(Booking booking)
    {
        var mode = booking.SessionMode ?? string.Empty;
        var isConfirmedOrDone = booking.Status is Domain.Enums.BookingStatus.Confirmed
            or Domain.Enums.BookingStatus.Completed;

        if (mode.Contains("person", StringComparison.OrdinalIgnoreCase))
        {
            var loc = booking.TutorProfile?.InPersonLocation?.Trim();
            if (!string.IsNullOrEmpty(loc)) return loc;
            return isConfirmedOrDone
                ? "In-person — contact your tutor in Messages for the meeting address."
                : "In-person — your tutor will share the meeting address after they confirm this session.";
        }
        if (!string.IsNullOrWhiteSpace(booking.MeetingLink))
            return booking.MeetingLink;
        return isConfirmedOrDone
            ? "Online — open the join link above or message your tutor for the meeting URL."
            : "Online — meeting link shared when your tutor confirms the session.";
    }

    private static BookingResponse MapToResponse(Booking booking)
    {
        return new BookingResponse
        {
            Id = booking.Id,
            TutorProfileId = booking.TutorProfileId,
            TutorName = booking.TutorProfile?.UserAccount?.FullName ?? "Unknown Tutor",
            TutorProfilePhotoUrl = booking.TutorProfile?.ProfilePhotoUrl ?? string.Empty,
            StudentProfileId = booking.StudentProfileId,
            StudentName = booking.StudentProfile?.UserAccount?.FullName ?? "Unknown Student",
            BookingDate = booking.BookingDate,
            TimeSlot = booking.TimeSlot,
            Status = booking.Status.ToString(),
            SessionMode = booking.SessionMode,
            Subject = booking.Subject,
            Fee = booking.Fee,
            MeetingLink = booking.MeetingLink,
            LocationOrMeetingInfo = ResolveLocationOrMeetingInfo(booking),
            StudentNotes = booking.StudentNotes,
            TutorNotes = booking.TutorNotes,
            CancellationReason = booking.CancellationReason,
            CancelledBy = booking.CancelledBy,
            CreatedAtUtc = booking.CreatedAtUtc
        };
    }
}
