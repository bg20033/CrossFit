namespace StandUpFitness.Models;

public class CashRegister
{
    public int Id { get; set; }
    public int StaffId { get; set; }
    public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAt { get; set; }
    public decimal OpeningBalance { get; set; }
    public decimal ClosingBalance { get; set; }
    public decimal TotalIncome { get; set; }
    public decimal TotalExpense { get; set; }
    public string Status { get; set; } = "open"; // open, closed
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Staff Staff { get; set; } = null!;
    public ICollection<Finance> Transactions { get; set; } = new List<Finance>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
}
