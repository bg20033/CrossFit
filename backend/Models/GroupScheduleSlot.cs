namespace StandUpFitness.Models;

// One recurring weekly session for a TrainingGroup (e.g. Monday 18:00–19:30).
// A group repeats the same set of slots every week. Times are stored as minutes
// from midnight (same convention as ClassSession), DayOfWeek as "Monday".."Sunday".
public class GroupScheduleSlot
{
    public int Id { get; set; }
    public int TrainingGroupId { get; set; }
    public string DayOfWeek { get; set; } = null!; // "Monday".."Sunday"
    public int StartMin { get; set; }              // minutes from midnight
    public int EndMin { get; set; }

    public TrainingGroup TrainingGroup { get; set; } = null!;
}
