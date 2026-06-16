namespace StandUpFitness.Models;

public class Staff
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int? GymOwnerId { get; set; }
    public string Position { get; set; } = "staff"; // receptionist, cleaner, admin, etc.
    public decimal Salary { get; set; }
    public DateTime HireDate { get; set; } = DateTime.UtcNow;
    public DateTime? TerminationDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User User { get; set; } = null!;
    public GymOwner? GymOwner { get; set; }
}
