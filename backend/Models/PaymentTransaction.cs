namespace StandUpFitness.Models;

public class PaymentTransaction
{
    public int Id { get; set; }
    public int? InvoiceId { get; set; }
    public int? ClientId { get; set; }
    public int? StaffId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "EUR";
    public string Method { get; set; } = "cash"; // cash | card | transfer | online
    public string Status { get; set; } = "pending"; // pending | paid | failed | refunded
    public string Provider { get; set; } = "manual";
    public string? ProviderReference { get; set; }
    public string? ReceiptNumber { get; set; }
    public string? ReceiptHtml { get; set; }
    public string? IdempotencyKey { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Invoice? Invoice { get; set; }
    public Client? Client { get; set; }
    public User? Staff { get; set; }
}
