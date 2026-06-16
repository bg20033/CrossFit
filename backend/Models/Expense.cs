namespace StandUpFitness.Models;

public class Expense
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime ExpenseDate { get; set; } = DateTime.UtcNow;
    public string? ReceiptFile { get; set; }
    public int? ApprovedById { get; set; } // Admin who approved
    public string Status { get; set; } = "pending"; // pending, approved, rejected
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public FinanceCategory Category { get; set; } = null!;
    public User? ApprovedBy { get; set; }
}
