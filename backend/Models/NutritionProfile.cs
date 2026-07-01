namespace StandUpFitness.Models;

// Client nutrition profile — TDEE answers + computed targets (README → TDEE Calculator).
// Keyed by UserId so both core clients and tenant clients can have one.
public class NutritionProfile
{
    public int Id { get; set; }
    public int UserId { get; set; }

    public string Gender { get; set; } = "M";   // "M" | "F"
    public double WeightKg { get; set; }
    public double HeightCm { get; set; }
    public int Age { get; set; }
    public string Activity { get; set; } = "moderate"; // sedentary|light|moderate|high|veryHigh
    public string Goal { get; set; } = "maintain";     // lose|maintain|gain

    // Computed (server-side) targets.
    public int Bmr { get; set; }
    public int Tdee { get; set; }
    public int TargetCalories { get; set; }
    public int ProteinG { get; set; }
    public int CarbsG { get; set; }
    public int FatG { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
