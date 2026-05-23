using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UserManagment.API.Extensions;
using UserManagment.API.Middleware;
using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Contracts.Responses;
using UserManagment.Application.Interfaces;

namespace UserManagment.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/bookings")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingsController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    private string? GetAuthUserId() => HttpContext.GetAuthUserId();

    [HttpPost]
    public async Task<ActionResult<BookingResponse>> CreateBooking(CreateBookingRequest request, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsStudent()) return Forbid();

        var authUserId = GetAuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        try
        {
            var response = await _bookingService.CreateBookingAsync(authUserId, request, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Could not create booking. Please complete your student profile and try again.", detail = ex.Message });
        }
    }

    [HttpGet("student")]
    public async Task<ActionResult<IReadOnlyCollection<BookingResponse>>> GetStudentBookings(CancellationToken cancellationToken)
    {
        if (!HttpContext.IsStudent()) return Forbid();

        var authUserId = GetAuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        try
        {
            var response = await _bookingService.GetStudentBookingsAsync(authUserId, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "TUTOR,ADMIN")]
    [RequireApprovedTutor]
    [HttpGet("tutor")]
    public async Task<ActionResult<IReadOnlyCollection<BookingResponse>>> GetTutorBookings(CancellationToken cancellationToken)
    {
        if (!HttpContext.IsTutor()) return Forbid();

        var authUserId = GetAuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        try
        {
            var response = await _bookingService.GetTutorBookingsAsync(authUserId, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "TUTOR,ADMIN")]
    [RequireApprovedTutor]
    [HttpGet("tutor/stats")]
    public async Task<ActionResult<TutorDashboardStatsResponse>> GetTutorStats(CancellationToken cancellationToken)
    {
        if (!HttpContext.IsTutor()) return Forbid();

        var authUserId = GetAuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        try
        {
            var response = await _bookingService.GetTutorDashboardStatsAsync(authUserId, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("tutor/{tutorId}/booked-slots")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyCollection<string>>> GetBookedSlots(Guid tutorId, [FromQuery] DateTime date, CancellationToken cancellationToken)
    {
        var response = await _bookingService.GetBookedSlotsAsync(tutorId, date, cancellationToken);
        return Ok(response);
    }

    [Authorize(Roles = "TUTOR,ADMIN")]
    [RequireApprovedTutor]
    [HttpPatch("{id}/confirm")]
    public async Task<ActionResult<BookingResponse>> ConfirmBooking(Guid id, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsTutor()) return Forbid();

        var authUserId = GetAuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        try
        {
            var response = await _bookingService.ConfirmBookingAsync(authUserId, id, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
    }

    [HttpPatch("{id}/cancel")]
    public async Task<ActionResult<BookingResponse>> CancelBooking(Guid id, [FromBody] UpdateBookingStatusRequest request, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsStudent() && !HttpContext.IsTutor()) return Forbid();

        var authUserId = GetAuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        try
        {
            var response = await _bookingService.CancelBookingAsync(authUserId, id, request.Reason, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
    }

    [Authorize(Roles = "TUTOR,ADMIN")]
    [RequireApprovedTutor]
    [HttpPatch("{id}/complete")]
    public async Task<ActionResult<BookingResponse>> CompleteBooking(Guid id, [FromBody] UpdateBookingStatusRequest request, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsTutor()) return Forbid();

        var authUserId = GetAuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        try
        {
            var response = await _bookingService.CompleteBookingAsync(authUserId, id, request.TutorNotes, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
    }
}
