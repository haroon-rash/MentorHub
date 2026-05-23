using System.Net.Http.Json;
using System.Text.Json;

namespace UserManagment.API.Services;

public interface IAdminCredentialVerifier
{
    Task<bool> VerifyPasswordAsync(string email, string password, CancellationToken cancellationToken);
}

public class AdminCredentialVerifier : IAdminCredentialVerifier
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AdminCredentialVerifier> _logger;

    public AdminCredentialVerifier(HttpClient httpClient, IConfiguration configuration, ILogger<AdminCredentialVerifier> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        var baseUrl = configuration["Services:AuthServiceUrl"] ?? "http://auth-service:5006";
        _httpClient.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
    }

    public async Task<bool> VerifyPasswordAsync(string email, string password, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return false;
        }

        try
        {
            var response = await _httpClient.PostAsJsonAsync(
                "api/v1/auth/login",
                new { email, password },
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return false;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var root = doc.RootElement;
            if (root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object)
            {
                return data.TryGetProperty("token", out _) || data.TryGetProperty("accessToken", out _);
            }

            return root.TryGetProperty("token", out _) || root.TryGetProperty("accessToken", out _);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Admin credential verification failed for {Email}", email);
            return false;
        }
    }
}
