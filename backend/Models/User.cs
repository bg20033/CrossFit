namespace StandUpFitness.Models;

public enum UserRole
{
    Admin,
    Trainer,
    Client,
    GymOwner,
    Staff,
    Cashier,        // Arka — front desk POS + QR access
    TrainerTenant,  // rental trainer (micro-gym inside the gym)
    TenantClient    // client of a tenant trainer (isolated)
}

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public string PasswordHash { get; set; } = null!;
    public string Name { get; set; } = null!;
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Trainer> TrainerProfiles { get; set; } = new List<Trainer>();
    public ICollection<Client> ClientProfiles { get; set; } = new List<Client>();
    public ICollection<GymOwner> GymOwnerProfiles { get; set; } = new List<GymOwner>();
}
