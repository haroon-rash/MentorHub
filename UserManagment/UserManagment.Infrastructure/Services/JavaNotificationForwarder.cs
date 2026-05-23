using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using UserManagment.Application.Contracts;
using UserManagment.Application.Interfaces;
using UserManagment.Domain.Enums;

namespace UserManagment.Infrastructure.Services;

public class JavaNotificationForwarder : IExternalNotificationPublisher
{
    private const string InternalApiKeyHeader = "X-Internal-Api-Key";

    private readonly HttpClient _httpClient;
    private readonly ILogger<JavaNotificationForwarder> _logger;
    private readonly string? _internalApiKey;

    public JavaNotificationForwarder(HttpClient httpClient, IConfiguration configuration, ILogger<JavaNotificationForwarder> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        var baseUrl = configuration["Services:NotificationServiceUrl"] ?? "http://notification-service:8091";
        _httpClient.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
        _internalApiKey = configuration["InternalApi:NotificationServiceKey"]
            ?? configuration["InternalApi:Key"];
    }

    public async Task PublishAsync(
        string recipientAuthUserId,
        NotificationType type,
        string title,
        string message,
        Guid? relatedEntityId,
        NotificationDeliveryMetadata? metadata,
        CancellationToken cancellationToken)
    {
        var payload = new JavaNotificationPayload
        {
            RecipientAuthUserId = recipientAuthUserId,
            Type = type.ToString().ToUpperInvariant(),
            Title = title,
            Message = message,
            RelatedEntityId = relatedEntityId,
            ActionPath = metadata?.ActionPath,
        };

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "api/internal/notifications")
            {
                Content = JsonContent.Create(payload),
            };
            if (!string.IsNullOrWhiteSpace(_internalApiKey))
            {
                request.Headers.Add(InternalApiKeyHeader, _internalApiKey);
            }
            var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Java notification forward failed: {Status}", response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Java notification forward unavailable");
        }
    }

    private sealed class JavaNotificationPayload
    {
        [JsonPropertyName("recipientAuthUserId")]
        public string RecipientAuthUserId { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("relatedEntityId")]
        public Guid? RelatedEntityId { get; set; }

        [JsonPropertyName("actionPath")]
        public string? ActionPath { get; set; }
    }
}
