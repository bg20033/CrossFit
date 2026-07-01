namespace StandUpFitness.Models;

public class ProgressLog
{
    public int Id { get; set; }
    public int ClientId { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public decimal Weight { get; set; }
    public decimal? Chest { get; set; }
    public decimal? Waist { get; set; }
    public decimal? Hips { get; set; }
    public decimal? Arms { get; set; }
    public decimal? Thighs { get; set; }
    public decimal? Calves { get; set; }
    public decimal? Shoulders { get; set; }
    public decimal? Back { get; set; }
    public decimal? BodyFat { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Client Client { get; set; } = null!;
}
