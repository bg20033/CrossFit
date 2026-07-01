namespace StandUpFitness.Models;

public class TenantClient
{
    public int Id { get; set; }
    public int TrainerTenantId { get; set; }
    public int? UserId { get; set; }
    public string Name { get; set; } = null!;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Goal { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public TrainerTenant TrainerTenant { get; set; } = null!;
    public User? User { get; set; }
}
