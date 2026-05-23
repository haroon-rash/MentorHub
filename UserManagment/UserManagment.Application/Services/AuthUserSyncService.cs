using UserManagment.Application.Contracts.Events;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;

namespace UserManagment.Application.Services;

public class AuthUserSyncService : IAuthUserSyncService
{
    private const string SuperAdminEmail = "haroonurrasheed1212@gmail.com";
    private readonly IUserAccountRepository _userAccountRepository;
    private readonly IUnitOfWork _unitOfWork;

    public AuthUserSyncService(IUserAccountRepository userAccountRepository, IUnitOfWork unitOfWork)
    {
        _userAccountRepository = userAccountRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task HandleAuthUserCreatedAsync(AuthUserCreatedEvent authUserCreatedEvent, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(authUserCreatedEvent.AuthId) || string.IsNullOrWhiteSpace(authUserCreatedEvent.Email))
        {
            return;
        }

        var existingUser = await _userAccountRepository.GetByAuthUserIdAsync(authUserCreatedEvent.AuthId, cancellationToken);
        if (existingUser != null)
        {
            existingUser.FullName = authUserCreatedEvent.Name;
            existingUser.Email = authUserCreatedEvent.Email;
            existingUser.IsEmailVerified = authUserCreatedEvent.IsVerified;
            existingUser.Role = ParseRole(authUserCreatedEvent.Role, authUserCreatedEvent.Email);
            await _userAccountRepository.UpdateAsync(existingUser, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return;
        }

        var userAccount = new UserAccount
        {
            Id = Guid.NewGuid(),
            AuthUserId = authUserCreatedEvent.AuthId,
            FullName = authUserCreatedEvent.Name,
            Email = authUserCreatedEvent.Email,
            IsEmailVerified = authUserCreatedEvent.IsVerified,
            Role = ParseRole(authUserCreatedEvent.Role, authUserCreatedEvent.Email),
            CreatedAtUtc = DateTime.UtcNow
        };

        await _userAccountRepository.AddAsync(userAccount, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static PlatformUserRole ParseRole(string role, string email)
    {
        if (!string.IsNullOrWhiteSpace(email) && string.Equals(email.Trim(), SuperAdminEmail, StringComparison.OrdinalIgnoreCase))
        {
            return PlatformUserRole.SuperAdmin;
        }

        if (string.IsNullOrWhiteSpace(role))
        {
            return PlatformUserRole.Student;
        }

        return role.Trim().ToUpperInvariant() switch
        {
            "TUTOR" => PlatformUserRole.Tutor,
            "ADMIN" => PlatformUserRole.SuperAdmin,
            "OWNER" => PlatformUserRole.SuperAdmin,
            _ => PlatformUserRole.Student
        };
    }
}
