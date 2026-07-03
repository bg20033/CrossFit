using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Services;

/// <summary>
/// Shared "materialize weekly GroupScheduleSlots into dated GroupSession rows"
/// logic (2026-07-03), extracted so it can run from two places:
///   1. GroupSessionGeneratorService — the daily background tick that keeps a
///      rolling ~5-week horizon topped up for every group ("infinitely", i.e.
///      it never runs out as long as the app keeps running — each day the
///      window just slides one day further).
///   2. TrainingGroupsController — right when a group is created or its weekly
///      slots are edited, so the admin sees sessions immediately instead of
///      waiting up to 24h for the next background tick.
/// Idempotent per (TrainingGroupId, Date, StartMin) — safe to call from both.
/// Caller is responsible for SaveChangesAsync.
/// </summary>
public static class GroupSessionGenerator
{
    public const int DefaultHorizonDays = 35;

    private static readonly string[] Days =
        { "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" };

    /// <summary>
    /// Ensures GroupSessions exist for every slot of <paramref name="group"/> from
    /// <paramref name="fromDateLocal"/> through the horizon. <paramref name="group"/>
    /// must have ScheduleSlots loaded. Returns the number of rows added (not yet saved).
    /// </summary>
    public static async Task<int> GenerateForGroupAsync(
        FitnessContext context, TrainingGroup group, DateTime fromDateLocal, int horizonDays = DefaultHorizonDays)
    {
        if (group.ScheduleSlots.Count == 0) return 0;

        var fromDate = fromDateLocal.Date;
        var horizonEnd = fromDate.AddDays(horizonDays);

        var existing = await context.GroupSessions
            .Where(s => s.TrainingGroupId == group.Id && s.Date >= fromDate && s.Date < horizonEnd)
            .Select(s => new { s.Date, s.StartMin })
            .ToListAsync();
        var existingKeys = existing.Select(e => (e.Date.Date, e.StartMin)).ToHashSet();

        var created = 0;
        for (var date = fromDate; date < horizonEnd; date = date.AddDays(1))
        {
            var dayName = Days[(int)date.DayOfWeek];
            foreach (var slot in group.ScheduleSlots.Where(s => s.DayOfWeek == dayName))
            {
                var key = (date.Date, slot.StartMin);
                if (existingKeys.Contains(key)) continue;

                context.GroupSessions.Add(new GroupSession
                {
                    TrainingGroupId = group.Id,
                    Date = date,
                    DayOfWeek = dayName,
                    StartMin = slot.StartMin,
                    EndMin = slot.EndMin,
                    Status = "scheduled"
                });
                existingKeys.Add(key);
                created++;
            }
        }

        return created;
    }
}
