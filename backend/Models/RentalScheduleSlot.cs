namespace StandUpFitness.Models;

// One recurring weekly session for a qiragji's (TrainerTenant's) own space, e.g.
// Monday 18:00-19:30. Mirrors GroupScheduleSlot: the qiragji (or an admin) sets
// these directly when configuring the tenant — name, time, duration, how many
// times a week — instead of booking a slot out of a shared pool.
public class RentalScheduleSlot
{
    public int Id { get; set; }
    public int TrainerTenantId { get; set; }
    public string DayOfWeek { get; set; } = null!; // "Monday".."Sunday"
    public int StartMin { get; set; }              // minutes from midnight
    public int EndMin { get; set; }

    public TrainerTenant TrainerTenant { get; set; } = null!;
}
