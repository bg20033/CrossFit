namespace StandUpFitness.Models;

public class MembershipPlan
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public int DurationDays { get; set; }
    public decimal Price { get; set; }
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
