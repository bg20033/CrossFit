namespace StandUpFitness.Models;

public class Goal
{
    public int Id { get; set; }
    public int ClientId { get; set; }
    public string Title { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // weight_loss, muscle_gain, strength, etc.
    public DateTime TargetDate { get; set; }
    public string Status { get; set; } = "in_progress"; // in_progress, completed, abandoned
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Client Client { get; set; } = null!;
}
