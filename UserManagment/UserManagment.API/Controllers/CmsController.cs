using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserManagment.API.Contracts;
using UserManagment.API.Extensions;
using UserManagment.Domain.Entities;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.API.Controllers;

[ApiController]
[Route("api/v1/cms")]
public class CmsController(UserManagmentDbContext context) : ControllerBase
{
    private readonly UserManagmentDbContext _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAllPages(CancellationToken cancellationToken)
    {
        var pages = await _context.Set<CmsPage>()
            .Select(p => new { p.Slug, p.Title, p.CreatedAtUtc, p.UpdatedAtUtc })
            .ToListAsync(cancellationToken);
            
        return Ok(ApiResponse<object>.Ok(pages));
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetPageBySlug(string slug, CancellationToken cancellationToken)
    {
        var page = await _context.Set<CmsPage>()
            .FirstOrDefaultAsync(p => p.Slug.ToLower() == slug.ToLower(), cancellationToken);

        if (page == null)
            return NotFound(ApiResponse<string>.Fail("Page not found"));

        return Ok(ApiResponse<CmsPage>.Ok(page));
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreatePage([FromBody] CmsPageRequest request, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsAdmin()) return Forbid();

        var exists = await _context.Set<CmsPage>().AnyAsync(p => p.Slug.ToLower() == request.Slug.ToLower(), cancellationToken);
        if (exists)
            return BadRequest(ApiResponse<string>.Fail("Slug already exists"));

        var page = new CmsPage
        {
            Slug = request.Slug,
            Title = request.Title,
            Content = request.Content,
            ImageUrl = request.ImageUrl,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Set<CmsPage>().Add(page);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse<CmsPage>.Ok(page, "Page created successfully"));
    }

    [Authorize]
    [HttpPut("{slug}")]
    public async Task<IActionResult> UpdatePage(string slug, [FromBody] CmsPageRequest request, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsAdmin()) return Forbid();

        var page = await _context.Set<CmsPage>()
            .FirstOrDefaultAsync(p => p.Slug.ToLower() == slug.ToLower(), cancellationToken);

        if (page == null)
            return NotFound(ApiResponse<string>.Fail("Page not found"));

        page.Title = request.Title;
        page.Content = request.Content;
        page.ImageUrl = request.ImageUrl;
        page.UpdatedAtUtc = DateTime.UtcNow;

        // Note: We don't update slug here to avoid breaking links. 
        // If slug needs update, delete and recreate or add slug update logic with caution.

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse<CmsPage>.Ok(page, "Page updated successfully"));
    }

    [Authorize]
    [HttpDelete("{slug}")]
    public async Task<IActionResult> DeletePage(string slug, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsAdmin()) return Forbid();

        var page = await _context.Set<CmsPage>()
            .FirstOrDefaultAsync(p => p.Slug.ToLower() == slug.ToLower(), cancellationToken);

        if (page == null)
            return NotFound(ApiResponse<string>.Fail("Page not found"));

        _context.Set<CmsPage>().Remove(page);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse<string>.Ok(slug, "Page deleted successfully"));
    }
}

public class CmsPageRequest
{
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}
