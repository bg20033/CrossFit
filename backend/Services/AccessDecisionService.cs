using StandUpFitness.Models;

namespace StandUpFitness.Services;

// Server-side QR access decision (README → "QR Access Control").
// The camera/scanner is only the input; the verdict is computed here.
public static class AccessDecisionService
{
    public const int EarlyCheckinMin = 10;
    public const int LateCheckinMin = 20;     // entry (10) + changing (10)
    public const int SessionMin = 90;         // 10 + 10 + 60 + 10
    public const int DefaultCapacity = 12;

    public record Verdict(string Decision, string Reason, string Action);

    // A group's weekly schedule may have several slots. When none are persisted yet
    // (e.g. legacy data), fall back to a single slot built from the legacy columns.
    public static IEnumerable<GroupScheduleSlot> EffectiveSlots(TrainingGroup g)
    {
        if (g.ScheduleSlots is { Count: > 0 })
            return g.ScheduleSlots;
        return new[]
        {
            new GroupScheduleSlot
            {
                TrainingGroupId = g.Id,
                DayOfWeek = g.DayOfWeek,
                StartMin = (int)g.ScheduleStart.TimeOfDay.TotalMinutes,
                EndMin = (int)g.ScheduleEnd.TimeOfDay.TotalMinutes,
            }
        };
    }

    public static bool IsScheduledToday(GroupScheduleSlot s, DateTime now) =>
        string.Equals(s.DayOfWeek, now.DayOfWeek.ToString(), StringComparison.OrdinalIgnoreCase);

    public static bool WithinCheckinWindow(GroupScheduleSlot s, DateTime now)
    {
        if (!IsScheduledToday(s, now)) return false;
        var nowMin = (int)now.TimeOfDay.TotalMinutes;
        return nowMin >= s.StartMin - EarlyCheckinMin && nowMin <= s.StartMin + LateCheckinMin;
    }

    public static int RemainingMin(GroupScheduleSlot s, DateTime now)
    {
        var nowMin = (int)now.TimeOfDay.TotalMinutes;
        return Math.Max(0, s.StartMin + SessionMin - nowMin);
    }

    // Pick the slot (across all of the member's groups) scheduled today and closest
    // to "now", returning the owning group with it. Returns (null, null) if none.
    public static (TrainingGroup? group, GroupScheduleSlot? slot) ScheduledNow(
        IEnumerable<TrainingGroup> groups, DateTime now)
    {
        var nowMin = (int)now.TimeOfDay.TotalMinutes;
        return groups
            .SelectMany(g => EffectiveSlots(g).Select(s => (group: (TrainingGroup?)g, slot: (GroupScheduleSlot?)s)))
            .Where(x => IsScheduledToday(x.slot!, now))
            .OrderBy(x => Math.Abs(x.slot!.StartMin - nowMin))
            .FirstOrDefault();
    }

    /// <summary>True when the member has an active, non-expired package.</summary>
    public static bool PaymentActive(Client c, DateTime now) =>
        c.IsActive && (!c.MembershipExpiry.HasValue || c.MembershipExpiry.Value.Date >= now.Date);

    public static Verdict Decide(
        Client? member,
        TrainingGroup? groupNow,
        GroupScheduleSlot? slotNow,
        int inGymCount,
        int capacity,
        bool alreadyInside,
        DateTime now)
    {
        if (member != null && alreadyInside)
            return new("exit", "Dalje e regjistruar", "exit");
        if (member == null)
            return new("denied", "Anëtar i panjohur", "deny");
        if (!PaymentActive(member, now))
            return new("denied", "Pakoja ka skaduar ose pa pagesë", "deny");
        if (groupNow == null || slotNow == null)
            return new("denied", "Nuk ke grup të caktuar në këtë orar", "deny");
        if (!WithinCheckinWindow(slotNow, now))
            return new("denied", "Jashtë orarit të grupit", "deny");
        if (inGymCount >= capacity)
            return new("denied", "Salla është në kapacitet", "deny");
        return new("granted", "Qasje e lejuar — mirë se vjen", "entry");
    }
}
