namespace StandUpFitness.Models;

public class Client
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int? TrainerId { get; set; }
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public string MembershipType { get; set; } = "standard";
    public int? PlanId { get; set; }
    public DateTime? MembershipExpiry { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User User { get; set; } = null!;
    public Trainer? Trainer { get; set; }
    public MembershipPlan? Plan { get; set; }
    public ICollection<TrainingGroup> Groups { get; set; } = new List<TrainingGroup>();
    public ICollection<PersonalSession> PersonalSessions { get; set; } = new List<PersonalSession>();
    public ICollection<Goal> Goals { get; set; } = new List<Goal>();
    public ICollection<DietPlan> DietPlans { get; set; } = new List<DietPlan>();
    public ICollection<WorkoutPlan> WorkoutPlans { get; set; } = new List<WorkoutPlan>();
    public ICollection<Attendance> Attendance { get; set; } = new List<Attendance>();
}
