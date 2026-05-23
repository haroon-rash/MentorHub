using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;

namespace UserManagment.Gateway.Services;

public sealed class GatewayJwtValidator
{
    private readonly RsaSecurityKey _signingKey;
    private readonly JwtSecurityTokenHandler _handler = new();

    public GatewayJwtValidator(IWebHostEnvironment env)
    {
        var keyPath = Path.Combine(env.ContentRootPath, "keys", "jwt_public_key.pem");
        if (!File.Exists(keyPath))
        {
            throw new FileNotFoundException($"JWT public key not found at {keyPath}");
        }

        var pem = File.ReadAllText(keyPath);
        using var rsa = RSA.Create();
        rsa.ImportFromPem(pem);
        _signingKey = new RsaSecurityKey(rsa.ExportParameters(false));
    }

    public bool TryValidate(string token, out ClaimsPrincipal? principal, out string? failureReason)
    {
        principal = null;
        failureReason = null;

        if (string.IsNullOrWhiteSpace(token))
        {
            failureReason = "missing_token";
            return false;
        }

        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = _signingKey,
            ClockSkew = TimeSpan.FromMinutes(2),
        };

        try
        {
            principal = _handler.ValidateToken(token, parameters, out var validated);
            if (validated is not JwtSecurityToken jwt)
            {
                failureReason = "invalid_token";
                return false;
            }

            var tokenType = principal.FindFirst("tokenType")?.Value;
            if (!string.IsNullOrEmpty(tokenType) && !string.Equals(tokenType, "access", StringComparison.OrdinalIgnoreCase))
            {
                failureReason = "invalid_token_type";
                return false;
            }

            var isVerified = principal.FindFirst("isVerified")?.Value;
            var verified = bool.TryParse(isVerified, out var parsed) && parsed
                           || string.Equals(isVerified, "true", StringComparison.OrdinalIgnoreCase);
            if (!verified)
            {
                failureReason = "email_not_verified";
                return false;
            }

            return true;
        }
        catch (SecurityTokenExpiredException)
        {
            failureReason = "token_expired";
            return false;
        }
        catch (Exception)
        {
            failureReason = "invalid_signature";
            return false;
        }
    }
}
