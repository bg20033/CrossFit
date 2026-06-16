namespace StandUpFitness.Models;

public class FinanceCategory
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Type { get; set; } = null!; // "income" or "expense"
    public string Description { get; set; } = string.Empty;
    public bool IsSystem { get; set; } = false; // System categories can't be deleted
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Finance> Finances { get; set; } = new List<Finance>();
}
