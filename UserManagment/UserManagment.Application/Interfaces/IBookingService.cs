using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;

namespace UserManagment.Application.Interfaces;

public interface IBookingService
{
    Task<BookingResponse> CreateBookingAsync(string authUserId, CreateBookingRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<BookingResponse>> GetStudentBookingsAsync(string authUserId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<BookingResponse>> GetTutorBookingsAsync(string authUserId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<string>> GetBookedSlotsAsync(Guid tutorId, DateTime date, CancellationToken cancellationToken);
    Task<BookingResponse> ConfirmBookingAsync(string tutorAuthUserId, Guid bookingId, CancellationToken cancellationToken);
    Task<BookingResponse> CancelBookingAsync(string authUserId, Guid bookingId, string? reason, CancellationToken cancellationToken);
    Task<BookingResponse> CompleteBookingAsync(string tutorAuthUserId, Guid bookingId, string? tutorNotes, CancellationToken cancellationToken);
    Task<TutorDashboardStatsResponse> GetTutorDashboardStatsAsync(string tutorAuthUserId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<TutorStudentSummaryResponse>> GetTutorStudentSummariesAsync(Guid tutorProfileId, string tutorAuthUserId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<StudentTutorSummaryResponse>> GetStudentTutorSummariesAsync(string studentAuthUserId, CancellationToken cancellationToken);
}
