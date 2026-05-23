using System.Net.Http.Json;

namespace UserManagment.API.Services;

public interface IAuthUserDeletionClient
{
    Task DeleteAuthUserByEmailAsync(string email, CancellationToken cancellationToken);
}

public class AuthUserDeletionClient : IAuthUserDeletionClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AuthUserDeletionClient> _logger;
    private readonly string _internalApiKey;

    public AuthUserDeletionClient(HttpClient httpClient, IConfiguration configuration, ILogger<AuthUserDeletionClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        var baseUrl = configuration["Services:AuthServiceUrl"] ?? "http://auth-service:5006";
        _httpClient.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
        _internalApiKey = configuration["InternalApi:Key"]
            ?? configuration["Services:InternalApiKey"]
            ?? "mentorhub-docker-internal-key";
    }

    public async Task DeleteAuthUserByEmailAsync(string email, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("Email is required to delete auth account.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "api/v1/auth/internal/users/delete-by-email");
        request.Headers.Add("X-MentorHub-Internal-Key", _internalApiKey);
        request.Content = JsonContent.Create(new { email = email.Trim().ToLowerInvariant() });

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("Auth user deletion failed ({Status}): {Body}", response.StatusCode, body);
            throw new InvalidOperationException("Could not remove login account. User may still exist in authentication service.");
        }
    }
}
