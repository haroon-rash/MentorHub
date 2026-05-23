using UserManagment.Application.Contracts.Requests;

namespace UserManagment.Application.Interfaces;

public interface ISessionAttendanceService
{
    Task RecordAttendanceAsync(string authUserId, RecordSessionAttendanceRequest request, CancellationToken cancellationToken);
}
