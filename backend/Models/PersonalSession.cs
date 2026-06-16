namespace StandUpFitness.Models;

public class PersonalSession
{
    public int Id { get; set; }
    public int TrainerId { get; set; }
    public int ClientId { get; set; }
    public DateTime ScheduledDate { get; set; }
    public TimeSpan Duration { get; set; }
    public string Status { get; set; } = "scheduled"; // scheduled, completed, cancelled
    public string? Notes { get; set; }
    public decimal Cost { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Trainer Trainer { get; set; } = null!;
    public Client Client { get; set; } = null!;
}
