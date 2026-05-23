using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UserManagment.API.Contracts;
using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Interfaces;
using UserManagment.API.Extensions;

namespace UserManagment.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/tutor-batches")]
public class TutorBatchesController : ControllerBase
{
    private readonly ITutorBatchService _batchService;

    public TutorBatchesController(ITutorBatchService batchService) => _batchService = batchService;

    private string? AuthUserId() => HttpContext.GetAuthUserId();

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTutorBatchRequest request, CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveTutor() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var batch = await _batchService.CreateBatchAsync(authUserId, request, cancellationToken);
            return Ok(ApiResponse<object>.Ok(batch, "Batch created and class sessions generated."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{batchId:guid}")]
    public async Task<IActionResult> Update(Guid batchId, [FromBody] UpdateTutorBatchRequest request, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var batch = await _batchService.UpdateBatchAsync(authUserId, batchId, request, cancellationToken);
            return Ok(ApiResponse<object>.Ok(batch, "Batch updated."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{batchId:guid}")]
    public async Task<IActionResult> Delete(Guid batchId, [FromQuery] bool force = false, [FromQuery] bool archiveInstead = true, CancellationToken cancellationToken = default)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            await _batchService.DeleteBatchAsync(authUserId, batchId, new DeleteTutorBatchRequest
            {
                Force = force,
                ArchiveInstead = archiveInstead,
            }, cancellationToken);
            return Ok(ApiResponse<object>.Ok(null, force ? "Batch deleted." : "Batch removed or archived."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{batchId:guid}/archive")]
    public async Task<IActionResult> Archive(Guid batchId, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var batch = await _batchService.ArchiveBatchAsync(authUserId, batchId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(batch, "Batch archived."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{batchId:guid}/duplicate")]
    public async Task<IActionResult> Duplicate(Guid batchId, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var batch = await _batchService.DuplicateBatchAsync(authUserId, batchId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(batch, "Batch duplicated as draft."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{batchId:guid}/complete")]
    public async Task<IActionResult> Complete(Guid batchId, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var batch = await _batchService.CompleteBatchAsync(authUserId, batchId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(batch, "Batch marked completed."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{batchId:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid batchId, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var batch = await _batchService.CancelBatchAsync(authUserId, batchId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(batch, "Batch cancelled."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveTutor() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var batches = await _batchService.GetTutorBatchesAsync(authUserId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(batches));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("tutor/{tutorProfileId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetForTutor(Guid tutorProfileId, CancellationToken cancellationToken)
    {
        var batches = await _batchService.GetPublishedBatchesForTutorAsync(tutorProfileId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(batches));
    }

    [HttpGet("{batchId:guid}")]
    public async Task<IActionResult> GetBatchDetail(Guid batchId, CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveTutor() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var detail = await _batchService.GetBatchDetailForTutorAsync(authUserId, batchId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(detail));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{batchId:guid}/sessions")]
    public async Task<IActionResult> GetSessions(Guid batchId, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var sessions = await _batchService.GetBatchSessionsAsync(authUserId, batchId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(sessions));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
