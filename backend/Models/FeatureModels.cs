namespace StandUpFitness.Models;

/// <summary>Before/after progress photo, stored as a base64 data URL.</summary>
public class ProgressPhoto
{
    public int Id { get; set; }
    public int ClientId { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public string Pose { get; set; } = "front"; // front | side | back
    public string DataUrl { get; set; } = string.Empty; // base64 image
    public decimal? Weight { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Client Client { get; set; } = null!;
}

/// <summary>A logged lift result for the leaderboard + PR tracker (weight × reps).</summary>
public class PersonalRecord
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Benchmark { get; set; } = string.Empty; // back-squat, deadlift, pull-ups...
    public decimal Value { get; set; } // pesha në kg (0 = trup i lirë, p.sh. pull-ups pa peshë shtesë)
    public int Reps { get; set; } = 1; // përsëritjet me atë peshë
    public DateTime Date { get; set; } = DateTime.UtcNow; // dita kur u krye
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow; // koha kur u regjistrua

    public User User { get; set; } = null!;
}

/// <summary>A nutrition recipe owned by a user; ingredients stored as JSON.</summary>
public class Recipe
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Servings { get; set; } = 1;
    public string ItemsJson { get; set; } = "[]"; // [{name,kcal,protein,carbs,fat}]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}

/// <summary>An item on a user's shopping list.</summary>
public class ShoppingItem
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool Checked { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}

/// <summary>A food entry in a user's daily nutrition log.</summary>
public class FoodLogEntry
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow.Date;
    public string Name { get; set; } = string.Empty;
    public int Kcal { get; set; }
    public decimal Protein { get; set; }
    public decimal Carbs { get; set; }
    public decimal Fat { get; set; }
    public string Meal { get; set; } = "breakfast";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}

/// <summary>Daily water total for a user's nutrition log.</summary>
public class WaterLog
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow.Date;
    public int WaterMl { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}

/// <summary>A class on the weekly schedule grid (drag-drop reschedulable).</summary>
public class ClassSession
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Trainer { get; set; } = "";
    public int Day { get; set; } // 0=Mon..6=Sun
    public int StartMin { get; set; } // minutes from midnight
    public int DurationMin { get; set; } = 60;
    public string Room { get; set; } = "";
    public int Capacity { get; set; } = 12;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
