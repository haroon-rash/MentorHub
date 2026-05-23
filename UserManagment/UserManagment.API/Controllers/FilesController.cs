using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using UserManagment.Application.Interfaces;

namespace UserManagment.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/files")]
[RequestSizeLimit(10 * 1024 * 1024)]
[RequestFormLimits(MultipartBodyLengthLimit = 10 * 1024 * 1024)]
public class FilesController : ControllerBase
{
    private const long MaxFileBytes = 10 * 1024 * 1024;
    private readonly IFileService _fileService;

    public FilesController(IFileService fileService)
    {
        _fileService = fileService;
    }

    [HttpPost("upload-profile-picture")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadProfilePicture([FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        return await SaveUploadAsync(file, new[] { ".jpg", ".jpeg", ".png", ".webp" }, "profiles", cancellationToken);
    }

    [HttpPost("upload-document")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadDocument([FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        return await SaveUploadAsync(
            file,
            new[] { ".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx" },
            "documents",
            cancellationToken);
    }

    private async Task<IActionResult> SaveUploadAsync(
        IFormFile? file,
        string[] allowedExtensions,
        string folderName,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }

        if (file.Length > MaxFileBytes)
        {
            return BadRequest(new { message = "File exceeds the 10 MB limit." });
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest(new { message = $"Invalid file type. Allowed: {string.Join(", ", allowedExtensions)}" });
        }

        await using var stream = file.OpenReadStream();
        var fileUrl = await _fileService.SaveFileAsync(stream, file.FileName, folderName, cancellationToken);

        return Ok(new { url = fileUrl });
    }
}
