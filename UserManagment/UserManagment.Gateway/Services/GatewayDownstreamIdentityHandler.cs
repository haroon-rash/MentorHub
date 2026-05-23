namespace UserManagment.Gateway.Services;

/// <summary>
/// Ensures gateway-validated identity headers reach downstream services via Ocelot's HttpClient.
/// </summary>
public sealed class GatewayDownstreamIdentityHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public GatewayDownstreamIdentityHandler(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var context = _httpContextAccessor.HttpContext;
        if (context is not null)
        {
            CopyHeader(context.Request.Headers, request, "X-Auth-User-Id");
            CopyHeader(context.Request.Headers, request, "X-User-Role");
            CopyHeader(context.Request.Headers, request, GatewayTrustHeaderNames.Verified);
        }

        return base.SendAsync(request, cancellationToken);
    }

    private static void CopyHeader(IHeaderDictionary source, HttpRequestMessage target, string name)
    {
        if (!source.TryGetValue(name, out var value))
        {
            return;
        }

        var text = value.ToString();
        if (string.IsNullOrWhiteSpace(text))
        {
            return;
        }

        target.Headers.Remove(name);
        target.Headers.TryAddWithoutValidation(name, text);
    }
}

/// <summary>Shared with API GatewayTrustMiddleware.</summary>
public static class GatewayTrustHeaderNames
{
    public const string Verified = "X-MentorHub-Gateway-Auth";
}
