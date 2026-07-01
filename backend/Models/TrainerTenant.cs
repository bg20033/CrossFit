namespace StandUpFitness.Models;

public class TrainerTenant
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string BusinessName { get; set; } = string.Empty;
    public string ContractStatus { get; set; } = "pending"; // pending | active | blocked | ended
    public DateTime ContractStart { get; set; } = DateTime.UtcNow;
    public DateTime? ContractEnd { get; set; }
    public decimal MonthlyRate { get; set; }
    public int? ApprovedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public ICollection<TenantClient> Clients { get; set; } = new List<TenantClient>();
    // Recurring weekly schedule the qiragji (or admin) configures directly —
    // name (BusinessName above) + these slots = the whole space setup.
    public ICollection<RentalScheduleSlot> ScheduleSlots { get; set; } = new List<RentalScheduleSlot>();
    public ICollection<RentalInvoice> Invoices { get; set; } = new List<RentalInvoice>();
}
