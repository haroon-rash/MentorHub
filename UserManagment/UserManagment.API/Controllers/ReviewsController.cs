using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UserManagment.API.Extensions;
using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Interfaces;

namespace UserManagment.API.Controllers;

[ApiController]
[Route("api/v1/reviews")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewService _reviewService;

    public ReviewsController(IReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateReview([FromBody] CreateReviewRequest request, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsStudent()) return Forbid();

        var authUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();

        try
        {
            var response = await _reviewService.CreateReviewAsync(authUserId, request, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
    }

    [HttpGet("tutor/{tutorProfileId}")]
    public async Task<IActionResult> GetTutorReviews(Guid tutorProfileId, CancellationToken cancellationToken)
    {
        var reviews = await _reviewService.GetTutorReviewsAsync(tutorProfileId, cancellationToken);
        return Ok(reviews);
    }
}
