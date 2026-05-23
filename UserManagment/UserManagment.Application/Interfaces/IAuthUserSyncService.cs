using UserManagment.Application.Contracts.Events;

namespace UserManagment.Application.Interfaces;

public interface IAuthUserSyncService
{
    Task HandleAuthUserCreatedAsync(AuthUserCreatedEvent authUserCreatedEvent, CancellationToken cancellationToken);
}
