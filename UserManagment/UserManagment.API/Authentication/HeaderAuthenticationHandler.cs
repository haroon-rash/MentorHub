using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace UserManagment.API.Authentication;

public class HeaderAuthenticationOptions : AuthenticationSchemeOptions
{
    public const string SchemeName = "HeaderAuth";
}

public class HeaderAuthenticationHandler : AuthenticationHandler<HeaderAuthenticationOptions>
{
    public HeaderAuthenticationHandler(
        IOptionsMonitor<HeaderAuthenticationOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authUserId = Request.Headers["X-Auth-User-Id"].ToString();
        var authEmail = Request.Headers["X-Auth-Email"].ToString();
        var role = Request.Headers["X-User-Role"].ToString();

        if (string.IsNullOrEmpty(authUserId))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, authUserId),
            new Claim(ClaimTypes.Name, authUserId)
        };

        if (!string.IsNullOrWhiteSpace(authEmail))
        {
            claims.Add(new Claim(ClaimTypes.Email, authEmail.Trim()));
        }

        if (!string.IsNullOrEmpty(role))
        {
            var normalizedRole = role.Trim().ToUpperInvariant();
            if (normalizedRole.StartsWith("ROLE_"))
            {
                normalizedRole = normalizedRole.Substring(5);
            }
            claims.Add(new Claim(ClaimTypes.Role, normalizedRole));
        }

        var identity = new ClaimsIdentity(claims, HeaderAuthenticationOptions.SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, HeaderAuthenticationOptions.SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
