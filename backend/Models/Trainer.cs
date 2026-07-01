namespace StandUpFitness.Models;

public class Trainer
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Specialization { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public decimal HourlyRate { get; set; }
    public bool IsAvailable { get; set; } = true;

    // --- Trainer payment model (commission per client) ---
    // How the trainer is paid. "prorated" = (sessionsHeld/sessionsPlanned) × clients × rate,
    // "flat" = clients × rate (no proration), "hourly" = legacy HourlyRate only.
    public string PaymentModel { get; set; } = "prorated"; // prorated | flat | hourly
    // € earned per client per month (the "20€" in the audit formula). Default 0.
    public decimal CommissionPerClient { get; set; } = 0m;
    // Employment type label (e.g. "employee", "freelance"). Free-form / dynamic.
    public string TrainerType { get; set; } = "employee";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<TrainingGroup> Groups { get; set; } = new List<TrainingGroup>();
    public ICollection<PersonalSession> PersonalSessions { get; set; } = new List<PersonalSession>();
    public ICollection<DietPlan> DietPlans { get; set; } = new List<DietPlan>();
    public ICollection<WorkoutPlan> WorkoutPlans { get; set; } = new List<WorkoutPlan>();
}
