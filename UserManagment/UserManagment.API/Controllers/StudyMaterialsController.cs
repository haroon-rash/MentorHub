using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UserManagment.API.Contracts;
using UserManagment.Application.Contracts.Requests;
using UserManagment.Application.Interfaces;
using UserManagment.API.Extensions;

namespace UserManagment.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/study-materials")]
public class StudyMaterialsController : ControllerBase
{
    private readonly IStudyMaterialService _materialService;

    public StudyMaterialsController(IStudyMaterialService materialService) => _materialService = materialService;

    private string? AuthUserId() => HttpContext.GetAuthUserId();

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStudyMaterialRequest request, CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveTutor() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var created = await _materialService.CreateAsync(authUserId, request, cancellationToken);
            return Ok(ApiResponse<object>.Ok(created, "Study material published."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{materialId:guid}")]
    public async Task<IActionResult> Update(Guid materialId, [FromBody] UpdateStudyMaterialRequest request, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            var updated = await _materialService.UpdateAsync(authUserId, materialId, request, cancellationToken);
            return Ok(ApiResponse<object>.Ok(updated, "Study material updated."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{materialId:guid}")]
    public async Task<IActionResult> Delete(Guid materialId, CancellationToken cancellationToken)
    {
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        try
        {
            await _materialService.DeleteAsync(authUserId, materialId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(null, "Study material removed."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("tutor")]
    public async Task<IActionResult> GetForTutor(CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveTutor() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        var items = await _materialService.GetForTutorAsync(authUserId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(items));
    }

    [HttpGet("student")]
    public async Task<IActionResult> GetForStudent(CancellationToken cancellationToken)
    {
        if (HttpContext.ForbidUnlessActiveStudent() is { } forbid) return forbid;
        var authUserId = AuthUserId();
        if (string.IsNullOrEmpty(authUserId)) return Unauthorized();
        var items = await _materialService.GetForStudentAsync(authUserId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(items));
    }
}
