namespace StandUpFitness.Services;

/// <summary>
/// Collision-resistant document numbers. The old pattern
/// ("INV-yyyyMMdd-" + Random 1000-9999) had ~9000 possible values per day
/// against UNIQUE indexes on InvoiceNumber / ReceiptNumber, so a busy day
/// eventually threw DbUpdateException (birthday paradox: ~50% after ~112
/// documents). A GUID fragment makes collisions practically impossible while
/// keeping the number short and readable.
/// </summary>
public static class DocumentNumbers
{
    private static string Suffix() => Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();

    public static string Invoice() => $"INV-{DateTime.UtcNow:yyyyMMdd}-{Suffix()}";
    public static string Receipt() => $"RC-{DateTime.UtcNow:yyyyMMdd}-{Suffix()}";
    public static string Refund() => $"RF-{DateTime.UtcNow:yyyyMMdd}-{Suffix()}";
    public static string Rent() => $"QR-{DateTime.UtcNow:yyyyMMdd}-{Suffix()}";
}
