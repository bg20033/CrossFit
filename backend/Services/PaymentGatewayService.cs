namespace StandUpFitness.Services;

public record PaymentGatewayResult(string Status, string Provider, string? ProviderReference, string? CheckoutUrl);

public interface IPaymentGatewayService
{
    Task<PaymentGatewayResult> CreateAsync(string method, decimal amount, string currency, string receiptNumber);
}

public class PaymentGatewayService : IPaymentGatewayService
{
    private readonly IConfiguration _configuration;

    public PaymentGatewayService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public Task<PaymentGatewayResult> CreateAsync(string method, decimal amount, string currency, string receiptNumber)
    {
        var normalized = (method ?? "cash").Trim().ToLowerInvariant();
        if (normalized is "cash" or "card" or "transfer" or "bank" or "pos")
            return Task.FromResult(new PaymentGatewayResult("paid", "manual", null, null));

        var provider = (_configuration["Payments:Provider"] ?? "").Trim();
        if (string.IsNullOrWhiteSpace(provider))
            return Task.FromResult(new PaymentGatewayResult("unconfigured", "unconfigured", null, null));

        var reference = $"{provider.ToUpperInvariant()}-{Guid.NewGuid():N}";
        var publicBaseUrl = _configuration["Payments:PublicBaseUrl"] ?? "";
        var checkoutUrl = string.IsNullOrWhiteSpace(publicBaseUrl)
            ? null
            : $"{publicBaseUrl.TrimEnd('/')}/payments/checkout/{reference}?amount={amount:0.00}&currency={currency}&receipt={receiptNumber}";

        return Task.FromResult(new PaymentGatewayResult("pending", provider, reference, checkoutUrl));
    }
}
