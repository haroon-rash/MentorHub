using Microsoft.AspNetCore.Hosting;
using UserManagment.Application.Interfaces;

namespace UserManagment.API.Services;

public class LocalFileService : IFileService
{
    private readonly IWebHostEnvironment _environment;

    public LocalFileService(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<string> SaveFileAsync(Stream fileStream, string fileName, string folderName, CancellationToken cancellationToken)
    {
        var wwwrootPath = _environment.WebRootPath;
        if (string.IsNullOrEmpty(wwwrootPath))
        {
            wwwrootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        }

        var folderPath = Path.Combine(wwwrootPath, "uploads", folderName);
        Directory.CreateDirectory(folderPath);

        var uniqueFileName = $"{Guid.NewGuid()}{Path.GetExtension(fileName)}";
        var filePath = Path.Combine(folderPath, uniqueFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await fileStream.CopyToAsync(stream, cancellationToken);
        }

        return $"/uploads/{folderName}/{uniqueFileName}";
    }

    public void DeleteFile(string fileUrl)
    {
        if (string.IsNullOrEmpty(fileUrl)) return;

        var wwwrootPath = _environment.WebRootPath;
        if (string.IsNullOrEmpty(wwwrootPath))
        {
            wwwrootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        }

        var filePath = Path.Combine(wwwrootPath, fileUrl.TrimStart('/'));
        if (File.Exists(filePath))
        {
            File.Delete(filePath);
        }
    }
}
