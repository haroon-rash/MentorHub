using Microsoft.AspNetCore.Mvc;
using UserManagment.API.Contracts;
using UserManagment.API.Services;

namespace UserManagment.API.Controllers;

[ApiController]
[Route("api/v1/contact")]
public class ContactController(IPlatformEmailService emailService, IConfiguration configuration) : ControllerBase
{
    [HttpPost("send")]
    public async Task<IActionResult> Send([FromBody] ContactMessageRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(ApiResponse<string>.Fail("Name, email, and message are required."));
        }

        var inbox = configuration["PlatformEmail:Inbox"] ?? configuration["PlatformEmail:From"] ?? "contact.mentorhub@gmail.com";
        var subject = string.IsNullOrWhiteSpace(request.Subject)
            ? $"MentorHub contact — {request.Name.Trim()}"
            : request.Subject.Trim();

        var body =
            $"New message from the MentorHub website\n\n" +
            $"Name: {request.Name.Trim()}\n" +
            $"Email: {request.Email.Trim()}\n" +
            (string.IsNullOrWhiteSpace(request.Phone) ? "" : $"Phone: {request.Phone.Trim()}\n") +
            $"\nMessage:\n{request.Message.Trim()}\n";

        await emailService.SendAsync(inbox, subject, body, cancellationToken);

        return Ok(ApiResponse<string>.Ok("sent", "Thank you — your message has been sent."));
    }
}

public class ContactMessageRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Subject { get; set; }
    public string Message { get; set; } = string.Empty;
}
