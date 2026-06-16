namespace StandUpFitness.Models;

public class TrainingGroup
{
    public int Id { get; set; }
    public int TrainerId { get; set; }
    public int? GymOwnerId { get; set; }
    public string Name { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
    public int MaxCapacity { get; set; }
    public DateTime ScheduleStart { get; set; }
    public DateTime ScheduleEnd { get; set; }
    public string DayOfWeek { get; set; } = string.Empty; // e.g., "Monday", "Tuesday"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Trainer Trainer { get; set; } = null!;
    public GymOwner? GymOwner { get; set; }
    public ICollection<Client> Clients { get; set; } = new List<Client>();
    public ICollection<Attendance> Attendance { get; set; } = new List<Attendance>();
}
