namespace UserManagment.Application.Interfaces;

public interface IFileService
{
    Task<string> SaveFileAsync(Stream fileStream, string fileName, string folderName, CancellationToken cancellationToken);
    void DeleteFile(string fileUrl);
}
