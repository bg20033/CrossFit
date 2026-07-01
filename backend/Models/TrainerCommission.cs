namespace StandUpFitness.Models;

// Monthly trainer payment based on the number of clients trained, prorated by how many
// of the planned group sessions were actually held that month.
//
//   proratedAmount = (SessionsHeld / SessionsPlanned) × ClientCount × RatePerClient
//   TotalAmount    = proratedAmount + Bonus − Deductions
//
// Mirrors the Salary model (used for Staff) but is keyed on TrainerId. When paid it
// produces a Finance "expense" under the "Trainer Commissions" category and stores the
// resulting FinanceId for traceability.
public class TrainerCommission
{
    public int Id { get; set; }
    public int TrainerId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }

    public int ClientCount { get; set; }          // clients in the trainer's groups for the period
    public decimal RatePerClient { get; set; }    // € per client (snapshot of Trainer.CommissionPerClient)
    public int SessionsPlanned { get; set; }
    public int SessionsHeld { get; set; }
    public int SessionsCancelled { get; set; }

    public string PaymentModel { get; set; } = "prorated"; // prorated | flat | hourly
    public decimal ProratedAmount { get; set; }
    public decimal Bonus { get; set; }
    public decimal Deductions { get; set; }
    public decimal TotalAmount { get; set; }

    public string Status { get; set; } = "pending"; // pending | paid | cancelled
    public DateTime? PaidDate { get; set; }
    public int? FinanceId { get; set; }           // linked expense transaction when paid
    public Finance? Finance { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Trainer Trainer { get; set; } = null!;
}
