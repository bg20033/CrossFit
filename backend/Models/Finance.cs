namespace StandUpFitness.Models;

public class Finance
{
    public int Id { get; set; }
    public string Type { get; set; } = null!; // "income" or "expense"
    public int CategoryId { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public int? UserId { get; set; } // Who made the transaction
    public int? CashRegisterId { get; set; }
    public string? ReceiptFile { get; set; } // File path to receipt
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "completed"; // pending, completed, cancelled
    public string PaymentMethod { get; set; } = "cash"; // cash, card, transfer
    public string? IdempotencyKey { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public FinanceCategory Category { get; set; } = null!;
    public User? User { get; set; }
    public CashRegister? CashRegister { get; set; }
}
