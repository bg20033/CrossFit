namespace StandUpFitness.Models;

public class TrainerWeeklyReport
{
    public int Id { get; set; }
    public int TrainerId { get; set; }
    public int ClientId { get; set; }
    public int? WorkoutPlanId { get; set; }
    public DateTime WeekStart { get; set; }
    public string Title { get; set; } = null!;
    public string Summary { get; set; } = string.Empty;
    public string GoalsJson { get; set; } = "[]";
    public string WorkoutsJson { get; set; } = "[]";
    public string NutritionJson { get; set; } = "{}";
    public string? PdfFile { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Trainer Trainer { get; set; } = null!;
    public Client Client { get; set; } = null!;
    public WorkoutPlan? WorkoutPlan { get; set; }
}
