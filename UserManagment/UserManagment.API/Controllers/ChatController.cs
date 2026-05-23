using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using UserManagment.API.Extensions;
using UserManagment.Application.Helpers;
using UserManagment.Application.Interfaces;
using UserManagment.API.Hubs;
using UserManagment.API.Services;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Entities;
using UserManagment.Domain.Enums;
using UserManagment.Infrastructure.Persistence;

namespace UserManagment.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/chat")]
public class ChatController : ControllerBase
{
    private readonly UserManagmentDbContext _context;
    private readonly IBookingRepository _bookingRepository;
    private readonly IStudentProfileRepository _studentProfileRepository;
    private readonly ITutorProfileRepository _tutorProfileRepository;
    private readonly INotificationService _notificationService;
    private readonly IHubContext<ChatHub> _chatHub;

    public ChatController(
        UserManagmentDbContext context,
        IBookingRepository bookingRepository,
        IStudentProfileRepository studentProfileRepository,
        ITutorProfileRepository tutorProfileRepository,
        INotificationService notificationService,
        IHubContext<ChatHub> chatHub)
    {
        _context = context;
        _bookingRepository = bookingRepository;
        _studentProfileRepository = studentProfileRepository;
        _tutorProfileRepository = tutorProfileRepository;
        _notificationService = notificationService;
        _chatHub = chatHub;
    }

    [HttpPost("send-message")]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request, CancellationToken cancellationToken)
    {
        var senderAuthUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrEmpty(senderAuthUserId)) return Unauthorized();
        if (string.IsNullOrEmpty(request.ReceiverAuthUserId)) return BadRequest(new { message = "Receiver ID is required" });
        if (string.IsNullOrEmpty(request.Content)) return BadRequest(new { message = "Message content is required" });

        var isAdmin = HttpContext.IsAdmin();
        var adminAuthIds = await UserIdentityResolver.GetAdminAuthUserIdsAsync(_context, cancellationToken);
        var receiverIsAdmin = adminAuthIds.Contains(request.ReceiverAuthUserId);
        var senderIsAdmin = adminAuthIds.Contains(senderAuthUserId);

        if (!isAdmin && !receiverIsAdmin && !senderIsAdmin)
        {
            var hasRelationship = await _bookingRepository.HasActiveBookingBetweenAsync(
                senderAuthUserId, request.ReceiverAuthUserId, cancellationToken);
            if (!hasRelationship)
            {
                return StatusCode(403, new { message = "You must have an active booking with this user to send messages." });
            }

            var isBlocked = await _context.BlockedUsers.AnyAsync(b =>
                (b.BlockerAuthUserId == senderAuthUserId && b.BlockedAuthUserId == request.ReceiverAuthUserId) ||
                (b.BlockerAuthUserId == request.ReceiverAuthUserId && b.BlockedAuthUserId == senderAuthUserId),
                cancellationToken);

            if (isBlocked)
            {
                return StatusCode(403, new { message = "You cannot send messages to this user because one of you has blocked the other." });
            }
        }

        if (!isAdmin && !receiverIsAdmin && !senderIsAdmin)
        {
            await EnsureNotSameAccountChatAsync(senderAuthUserId, request.ReceiverAuthUserId, cancellationToken);
        }

        var receiverExists = await _context.UserAccounts.AnyAsync(
            u => u.AuthUserId == request.ReceiverAuthUserId, cancellationToken);
        if (!receiverExists && isAdmin)
        {
            var signupExists = await _context.Database
                .SqlQuery<SignupIdRow>($"SELECT user_id::text AS \"Id\" FROM signup_user WHERE user_id::text = {request.ReceiverAuthUserId} LIMIT 1")
                .AnyAsync(cancellationToken);
            if (!signupExists)
            {
                return BadRequest(new { message = "Recipient user not found." });
            }
        }
        else if (!receiverExists)
        {
            return BadRequest(new { message = "Recipient user not found." });
        }

        var message = new ChatMessage
        {
            Id = Guid.NewGuid(),
            SenderAuthUserId = senderAuthUserId,
            ReceiverAuthUserId = request.ReceiverAuthUserId,
            Content = request.Content.Trim(),
            SentAtUtc = DateTime.UtcNow,
            IsRead = false
        };

        await _context.ChatMessages.AddAsync(message, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        var senderName = await _context.UserAccounts
            .Where(u => u.AuthUserId == senderAuthUserId)
            .Select(u => u.FullName)
            .FirstOrDefaultAsync(cancellationToken) ?? "Someone";

        var title = isAdmin ? "Message from Administration" : $"New message from {senderName}";
        var preview = request.Content.Trim().Length > 120
            ? request.Content.Trim()[..117] + "..."
            : request.Content.Trim();

        await _notificationService.CreateAsync(
            request.ReceiverAuthUserId,
            NotificationType.NewMessage,
            title,
            preview,
            message.Id,
            cancellationToken);

        await _chatHub.Clients.User(request.ReceiverAuthUserId).SendAsync(
            "ReceiveMessage",
            senderAuthUserId,
            message.Content,
            message.SentAtUtc,
            message.Id,
            cancellationToken);

        return Ok(new
        {
            id = message.Id,
            senderAuthUserId = message.SenderAuthUserId,
            receiverAuthUserId = message.ReceiverAuthUserId,
            content = message.Content,
            sentAtUtc = message.SentAtUtc,
            isRead = message.IsRead,
            isAdministration = isAdmin,
            senderDisplayName = isAdmin ? "Administration" : senderName
        });
    }

    [HttpGet("history/{otherUserId}")]
    public async Task<IActionResult> GetChatHistory(string otherUserId, CancellationToken cancellationToken)
    {
        var currentUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var isAdmin = HttpContext.IsAdmin();
        var adminAuthIds = await UserIdentityResolver.GetAdminAuthUserIdsAsync(_context, cancellationToken);

        if (!isAdmin && !adminAuthIds.Contains(otherUserId))
        {
            var hasRelationship = await _bookingRepository.HasActiveBookingBetweenAsync(
                currentUserId, otherUserId, cancellationToken);
            if (!hasRelationship)
            {
                return StatusCode(403, new { message = "You must have an active booking with this user to chat." });
            }
        }

        var messages = await _context.ChatMessages
            .Where(m => (m.SenderAuthUserId == currentUserId && m.ReceiverAuthUserId == otherUserId) ||
                        (m.SenderAuthUserId == otherUserId && m.ReceiverAuthUserId == currentUserId))
            .OrderBy(m => m.SentAtUtc)
            .ToListAsync(cancellationToken);

        var senderIds = messages.Select(m => m.SenderAuthUserId).Distinct().ToList();
        var senderNames = await _context.UserAccounts
            .Where(u => senderIds.Contains(u.AuthUserId))
            .ToDictionaryAsync(u => u.AuthUserId, u => u.FullName, cancellationToken);

        var payload = messages.Select(m =>
        {
            var fromAdmin = adminAuthIds.Contains(m.SenderAuthUserId);
            return new
            {
                m.Id,
                m.SenderAuthUserId,
                m.ReceiverAuthUserId,
                m.Content,
                m.SentAtUtc,
                m.IsRead,
                isAdministration = fromAdmin,
                senderDisplayName = fromAdmin
                    ? "Administration"
                    : senderNames.GetValueOrDefault(m.SenderAuthUserId, "User")
            };
        });

        return Ok(payload);
    }

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations(CancellationToken cancellationToken)
    {
        var currentUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var isAdmin = HttpContext.IsAdmin();

        var messagePartners = await _context.ChatMessages
            .Where(m => m.SenderAuthUserId == currentUserId || m.ReceiverAuthUserId == currentUserId)
            .Select(m => m.SenderAuthUserId == currentUserId ? m.ReceiverAuthUserId : m.SenderAuthUserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var partners = new HashSet<string>(messagePartners);

        if (!isAdmin)
        {
            var activeStatuses = new[]
            {
                BookingStatus.Pending,
                BookingStatus.Confirmed,
                BookingStatus.Completed,
            };

            var bookingPartners = await (
                from b in _context.Bookings
                join sp in _context.StudentProfiles on b.StudentProfileId equals sp.Id
                join su in _context.UserAccounts on sp.UserAccountId equals su.Id
                join tp in _context.TutorProfiles on b.TutorProfileId equals tp.Id
                join tu in _context.UserAccounts on tp.UserAccountId equals tu.Id
                where activeStatuses.Contains(b.Status)
                      && (su.AuthUserId == currentUserId || tu.AuthUserId == currentUserId)
                select su.AuthUserId == currentUserId ? tu.AuthUserId : su.AuthUserId
            ).Distinct().ToListAsync(cancellationToken);

            foreach (var p in bookingPartners) partners.Add(p);

            var activeEnrollmentStatuses = new[]
            {
                BatchEnrollmentStatus.Pending,
                BatchEnrollmentStatus.Active,
            };

            var enrollmentPartners = await (
                from e in _context.BatchEnrollments
                join sp in _context.StudentProfiles on e.StudentProfileId equals sp.Id
                join su in _context.UserAccounts on sp.UserAccountId equals su.Id
                join tp in _context.TutorProfiles on e.TutorProfileId equals tp.Id
                join tu in _context.UserAccounts on tp.UserAccountId equals tu.Id
                where activeEnrollmentStatuses.Contains(e.Status)
                      && (su.AuthUserId == currentUserId || tu.AuthUserId == currentUserId)
                select su.AuthUserId == currentUserId ? tu.AuthUserId : su.AuthUserId
            ).Distinct().ToListAsync(cancellationToken);

            foreach (var p in enrollmentPartners) partners.Add(p);

            var usersWhoBlockedMe = await _context.BlockedUsers
                .Where(b => b.BlockedAuthUserId == currentUserId)
                .Select(b => b.BlockerAuthUserId)
                .ToListAsync(cancellationToken);

            partners.ExceptWith(usersWhoBlockedMe);
        }

        return Ok(partners.ToList());
    }

    /// <summary>Admin: searchable list of tutors and students to start a conversation.</summary>
    [HttpGet("admin/recipients")]
    public async Task<IActionResult> GetAdminRecipients([FromQuery] string? search, CancellationToken cancellationToken)
    {
        if (!HttpContext.IsAdmin()) return Forbid();

        var query = _context.UserAccounts.AsNoTracking()
            .Where(u => u.Role == PlatformUserRole.Student || u.Role == PlatformUserRole.Tutor);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(term) ||
                u.Email.ToLower().Contains(term) ||
                u.AuthUserId.ToLower().Contains(term));
        }

        var users = await query
            .OrderBy(u => u.FullName)
            .Take(string.IsNullOrWhiteSpace(search) ? 50 : 30)
            .Select(u => new
            {
                u.AuthUserId,
                u.FullName,
                u.Email,
                Role = u.Role.ToString(),
                ProfilePhotoUrl = _context.TutorProfiles.Where(t => t.UserAccountId == u.Id).Select(t => t.ProfilePhotoUrl).FirstOrDefault()
                    ?? _context.StudentProfiles.Where(s => s.UserAccountId == u.Id).Select(s => s.ProfilePhotoUrl).FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        return Ok(users);
    }

    [HttpPost("block/{blockedUserId}")]
    public async Task<IActionResult> BlockUser(string blockedUserId, CancellationToken cancellationToken)
    {
        if (HttpContext.IsAdmin())
        {
            return BadRequest(new { message = "Administrators cannot block users from chat." });
        }

        var currentUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();
        if (currentUserId == blockedUserId) return BadRequest(new { message = "You cannot block yourself." });

        var alreadyBlocked = await _context.BlockedUsers.AnyAsync(b =>
            b.BlockerAuthUserId == currentUserId && b.BlockedAuthUserId == blockedUserId, cancellationToken);

        if (alreadyBlocked) return Ok(new { message = "User already blocked" });

        var block = new BlockedUser
        {
            Id = Guid.NewGuid(),
            BlockerAuthUserId = currentUserId,
            BlockedAuthUserId = blockedUserId,
            BlockedAtUtc = DateTime.UtcNow
        };

        await _context.BlockedUsers.AddAsync(block, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "User blocked successfully" });
    }

    [HttpPost("unblock/{blockedUserId}")]
    public async Task<IActionResult> UnblockUser(string blockedUserId, CancellationToken cancellationToken)
    {
        var currentUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var block = await _context.BlockedUsers.FirstOrDefaultAsync(b =>
            b.BlockerAuthUserId == currentUserId && b.BlockedAuthUserId == blockedUserId, cancellationToken);

        if (block == null) return NotFound(new { message = "Block record not found" });

        _context.BlockedUsers.Remove(block);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "User unblocked successfully" });
    }

    [HttpPost("profiles")]
    public async Task<IActionResult> GetProfileSummaries([FromBody] string[] authUserIds, CancellationToken cancellationToken)
    {
        var currentUserId = HttpContext.GetAuthUserId();
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var blockedByMe = HttpContext.IsAdmin()
            ? new List<string>()
            : await _context.BlockedUsers
                .Where(b => b.BlockerAuthUserId == currentUserId && authUserIds.Contains(b.BlockedAuthUserId))
                .Select(b => b.BlockedAuthUserId)
                .ToListAsync(cancellationToken);

        var adminAuthIds = await UserIdentityResolver.GetAdminAuthUserIdsAsync(_context, cancellationToken);

        var profiles = await _context.UserAccounts
            .Where(u => authUserIds.Contains(u.AuthUserId))
            .Select(u => new
            {
                u.AuthUserId,
                u.FullName,
                u.Email,
                Role = u.Role.ToString(),
                ProfilePhotoUrl = _context.TutorProfiles.Where(t => t.UserAccountId == u.Id).Select(t => t.ProfilePhotoUrl).FirstOrDefault()
                    ?? _context.StudentProfiles.Where(s => s.UserAccountId == u.Id).Select(s => s.ProfilePhotoUrl).FirstOrDefault(),
                IsBlockedByMe = blockedByMe.Contains(u.AuthUserId),
                IsAdministration = adminAuthIds.Contains(u.AuthUserId)
            })
            .ToListAsync(cancellationToken);

        var mapped = new List<object>();

        foreach (var p in profiles)
        {
            mapped.Add(new
            {
                authUserId = p.AuthUserId,
                displayName = p.IsAdministration ? "Administration" : p.FullName,
                fullName = p.IsAdministration ? "Administration" : p.FullName,
                email = p.Email,
                role = p.Role,
                profilePhotoUrl = p.ProfilePhotoUrl,
                isBlockedByMe = p.IsBlockedByMe,
                isAdministration = p.IsAdministration
            });
        }

        var foundIds = profiles.Select(p => p.AuthUserId).ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var id in authUserIds.Where(id => !foundIds.Contains(id) && adminAuthIds.Contains(id)))
        {
            mapped.Add(new
            {
                authUserId = id,
                displayName = "Administration",
                fullName = "Administration",
                email = (string?)null,
                role = "Admin",
                profilePhotoUrl = (string?)null,
                isBlockedByMe = false,
                isAdministration = true
            });
        }

        return Ok(mapped);
    }

    private async Task EnsureNotSameAccountChatAsync(
        string senderAuthUserId, string receiverAuthUserId, CancellationToken cancellationToken)
    {
        if (string.Equals(senderAuthUserId, receiverAuthUserId, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(DualRoleValidationHelper.SelfInteractionMessage);
        }

        var senderAccount = await _context.UserAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.AuthUserId == senderAuthUserId, cancellationToken);
        var receiverAccount = await _context.UserAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.AuthUserId == receiverAuthUserId, cancellationToken);

        if (senderAccount is null || receiverAccount is null)
        {
            return;
        }

        if (senderAccount.Id == receiverAccount.Id)
        {
            throw new InvalidOperationException(
                "You cannot message yourself.");
        }
    }

    private sealed class SignupIdRow
    {
        public string Id { get; set; } = string.Empty;
    }
}

public class SendMessageRequest
{
    public string ReceiverAuthUserId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}
