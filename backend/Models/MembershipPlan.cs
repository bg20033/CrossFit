using System.ComponentModel.DataAnnotations;

namespace StandUpFitness.Models;

public class MembershipPlan
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public int DurationDays { get; set; }
    public decimal Price { get; set; }
    public string Description { get; set; } = string.Empty;
    /// <summary>standard | police | free | shared | session_pass</summary>
    [MaxLength(40)]
    public string PlanType { get; set; } = "standard";
    /// <summary>Days after expiry where the membership still works before lock-out.</summary>
    public int GraceDays { get; set; } = 0;
    /// <summary>Number of people who can share this membership (1 = individual).</summary>
    public int MaxSharedMembers { get; set; } = 1;
    /// <summary>Total sessions for session-pass plans (0 = unlimited / time-based).</summary>
    public int SessionsTotal { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
