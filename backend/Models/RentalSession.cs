namespace StandUpFitness.Models;

// A specific, dated occurrence of a qiragji's recurring weekly RentalScheduleSlot.
// Mirrors GroupSession so rentals get the same calendar/generate/cancel/postpone
// workflow as training groups.
public class RentalSession
{
    public int Id { get; set; }
    public int TrainerTenantId { get; set; }

    public DateTime Date { get; set; }             // the calendar day of the session (date part)
    public string DayOfWeek { get; set; } = null!;  // "Monday".."Sunday"
    public int StartMin { get; set; }               // minutes from midnight
    public int EndMin { get; set; }

    // scheduled | held | cancelled | postponed
    public string Status { get; set; } = "scheduled";
    public string? Reason { get; set; }             // why cancelled/postponed
    public DateTime? PostponedToDate { get; set; }  // when postponed

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public TrainerTenant TrainerTenant { get; set; } = null!;
}
