using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserManagment.API.Contracts;
using UserManagment.API.Extensions;
using UserManagment.Domain.Entities;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.API.Controllers;

[ApiController]
[Route("api/v1/catalog")]
public class PlatformCatalogController(UserManagmentDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetCatalog([FromQuery] string? category, CancellationToken cancellationToken)
    {
        var query = context.PlatformCatalogItems.AsNoTracking().Where(item => item.IsActive);

        if (!string.IsNullOrWhiteSpace(category))
        {
            var normalized = category.Trim().ToLowerInvariant();
            query = query.Where(item => item.Category.ToLower() == normalized);
        }

        var items = await query
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.Label)
            .Select(item => new
            {
                item.Id,
                item.Category,
                item.Value,
                item.Label,
                item.SortOrder,
                item.AllowCustomEntry
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<object>.Ok(items));
    }

    [HttpGet("grouped")]
    public async Task<IActionResult> GetGrouped(CancellationToken cancellationToken)
    {
        var items = await context.PlatformCatalogItems.AsNoTracking()
            .Where(item => item.IsActive)
            .OrderBy(item => item.Category)
            .ThenBy(item => item.SortOrder)
            .ToListAsync(cancellationToken);

        var grouped = items
            .GroupBy(item => item.Category)
            .ToDictionary(
                group => group.Key,
                group => group.Select(item => new
                {
                    item.Id,
                    item.Value,
                    item.Label,
                    item.AllowCustomEntry
                }).ToList());

        return Ok(ApiResponse<object>.Ok(grouped));
    }
}

[ApiController]
[Route("api/v1/super-admin/catalog")]
public class PlatformCatalogAdminController(UserManagmentDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? category, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();

        try
        {
            var query = context.PlatformCatalogItems.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(category))
            {
                var normalized = category.Trim().ToLowerInvariant();
                query = query.Where(item => item.Category.ToLower() == normalized);
            }

            var items = await query
                .OrderBy(item => item.SortOrder)
                .ThenBy(item => item.Label)
                .Select(item => new
                {
                    item.Id,
                    item.Category,
                    item.Value,
                    item.Label,
                    item.SortOrder,
                    item.IsActive,
                    item.AllowCustomEntry,
                    item.CreatedAtUtc,
                    item.UpdatedAtUtc,
                })
                .ToListAsync(cancellationToken);

            return Ok(ApiResponse<object>.Ok(items));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<string>.Fail($"Catalog load failed: {ex.Message}"));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CatalogItemRequest request, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();

        var item = new PlatformCatalogItem
        {
            Category = request.Category.Trim().ToLowerInvariant(),
            Value = request.Value.Trim(),
            Label = string.IsNullOrWhiteSpace(request.Label) ? request.Value.Trim() : request.Label.Trim(),
            SortOrder = request.SortOrder,
            IsActive = request.IsActive,
            AllowCustomEntry = request.AllowCustomEntry,
            CreatedAtUtc = DateTime.UtcNow
        };

        context.PlatformCatalogItems.Add(item);
        await context.SaveChangesAsync(cancellationToken);
        return Ok(ApiResponse<PlatformCatalogItem>.Ok(item, "Catalog item created"));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CatalogItemRequest request, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();

        var item = await context.PlatformCatalogItems.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (item == null) return NotFound(ApiResponse<string>.Fail("Item not found"));

        item.Category = request.Category.Trim().ToLowerInvariant();
        item.Value = request.Value.Trim();
        item.Label = string.IsNullOrWhiteSpace(request.Label) ? request.Value.Trim() : request.Label.Trim();
        item.SortOrder = request.SortOrder;
        item.IsActive = request.IsActive;
        item.AllowCustomEntry = request.AllowCustomEntry;
        item.UpdatedAtUtc = DateTime.UtcNow;

        await context.SaveChangesAsync(cancellationToken);
        return Ok(ApiResponse<PlatformCatalogItem>.Ok(item, "Catalog item updated"));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsSuperAdmin()) return Forbid();

        var item = await context.PlatformCatalogItems.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (item == null) return NotFound(ApiResponse<string>.Fail("Item not found"));

        item.IsActive = false;
        item.UpdatedAtUtc = DateTime.UtcNow;
        await context.SaveChangesAsync(cancellationToken);
        return Ok(ApiResponse<object>.Ok(null, "Catalog item disabled"));
    }
}

public class CatalogItemRequest
{
    public string Category { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Label { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool AllowCustomEntry { get; set; }
}
