namespace StandUpFitness.Models;

public class GymOwner
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string GymName { get; set; } = null!;
    public string Address { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Logo { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<TrainingGroup> Groups { get; set; } = new List<TrainingGroup>();
    public ICollection<Staff> Staff { get; set; } = new List<Staff>();
}
