namespace StandUpFitness.Models;

public class RentalInvoice
{
    public int Id { get; set; }
    public int TrainerTenantId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public string Status { get; set; } = "pending"; // pending | paid | overdue | void
    public DateTime DueDate { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public TrainerTenant TrainerTenant { get; set; } = null!;
}
