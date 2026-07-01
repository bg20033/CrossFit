namespace StandUpFitness.Models;

// A specific, dated occurrence of a TrainingGroup's recurring weekly slot.
// While GroupScheduleSlot describes the repeating template ("every Monday 18:00"),
// GroupSession is the concrete instance for a given date that can be cancelled,
// postponed, covered by a substitute trainer, and confirmed "held" (trainer scan).
//
// This is the source of truth for *how many sessions were actually held* in a month,
// which drives the prorated trainer commission:
//   (sessionsHeld / sessionsPlanned) × clientCount × ratePerClient
public class GroupSession
{
    public int Id { get; set; }
    public int TrainingGroupId { get; set; }

    public DateTime Date { get; set; }            // the calendar day of the session (date part)
    public string DayOfWeek { get; set; } = null!; // "Monday".."Sunday"
    public int StartMin { get; set; }              // minutes from midnight
    public int EndMin { get; set; }

    // scheduled | held | cancelled | postponed
    public string Status { get; set; } = "scheduled";
    public string? Reason { get; set; }            // why cancelled/postponed
    public DateTime? PostponedToDate { get; set; } // when postponed

    // Substitute trainer covering this single session (GAP-10).
    public int? SubstituteTrainerId { get; set; }

    // Trainer self check-in (GAP-4): trainer scans to confirm the session ran.
    public bool TrainerCheckedIn { get; set; } = false;
    public DateTime? TrainerCheckInTime { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public TrainingGroup TrainingGroup { get; set; } = null!;
    public Trainer? SubstituteTrainer { get; set; }
}
