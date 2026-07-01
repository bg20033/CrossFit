namespace StandUpFitness.Models;

public class GymNotice
{
    public int Id { get; set; }
    public string Type { get; set; } = "announcement"; // announcement | closure | reschedule
    public string TargetAudience { get; set; } = "all"; // all | clients | trainers | staff
    public string Title { get; set; } = null!;
    public string Message { get; set; } = null!;
    public DateTime StartsAt { get; set; } = DateTime.UtcNow;
    public DateTime? EndsAt { get; set; }
    public bool IsActive { get; set; } = true;
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User CreatedByUser { get; set; } = null!;
}
