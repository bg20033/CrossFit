namespace StandUpFitness.Models;

public enum UserRole
{
    Admin,
    Trainer,
    Client,
    GymOwner,
    Staff
}

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public string Name { get; set; } = null!;
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Trainer> TrainerProfile { get; set; } = new List<Trainer>();
    public ICollection<Client> ClientProfile { get; set; } = new List<Client>();
    public ICollection<GymOwner> GymOwnerProfile { get; set; } = new List<GymOwner>();
}
