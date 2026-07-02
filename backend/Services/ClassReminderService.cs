using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;

namespace StandUpFitness.Services;

/// <summary>
/// Background worker that sends "class starts soon" reminders ~2h before a session.
/// Runs hourly; the non-overlapping [+2h, +3h) window means each session is notified
/// exactly once without needing a per-row "reminder sent" flag.
/// </summary>
public class ClassReminderService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IGymTimeService _gymTime;
    private readonly ILogger<ClassReminderService> _logger;

    public ClassReminderService(IServiceScopeFactory scopeFactory, IGymTimeService gymTime, ILogger<ClassReminderService> logger)
    {
        _scopeFactory = scopeFactory;
        _gymTime = gymTime;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Small startup delay so the app finishes booting/migrating first.
        try { await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); } catch (OperationCanceledException) { return; }

        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        do
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ClassReminderService tick failed");
            }
        }
        while (await SafeWaitAsync(timer, stoppingToken));
    }

    private static async Task<bool> SafeWaitAsync(PeriodicTimer timer, CancellationToken token)
    {
        try { return await timer.WaitForNextTickAsync(token); }
        catch (OperationCanceledException) { return false; }
    }

    private async Task RunOnceAsync(CancellationToken token)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FitnessContext>();
        var notifier = scope.ServiceProvider.GetRequiredService<INotificationService>();

        // Weekly slots are gym wall-clock times; matching them against UTC "now"
        // shifted every group reminder by the UTC offset once deployed. Personal
        // sessions keep UTC (their ScheduledDate is a stored UTC instant).
        var now = _gymTime.LocalNow;
        var utcNow = DateTime.UtcNow;
        var from = now.AddHours(2);
        var to = now.AddHours(3);
        var utcFrom = utcNow.AddHours(2);
        var utcTo = utcNow.AddHours(3);

        // Personal training sessions with a concrete date/time.
        var sessions = await db.PersonalSessions
            .Where(s => s.Status == "scheduled" && s.ScheduledDate >= utcFrom && s.ScheduledDate < utcTo)
            .Select(s => new { s.ClientId, s.ScheduledDate })
            .ToListAsync(token);

        foreach (var s in sessions)
            await notifier.SendAttendanceReminderAsync(s.ClientId, "Personal Training", s.ScheduledDate);

        // Recurring group classes: each weekly slot can fire its own reminder.
        var groups = await db.TrainingGroups
            .Select(g => new
            {
                g.Id,
                g.Name,
                Slots = g.ScheduleSlots.Select(s => new { s.DayOfWeek, s.StartMin }).ToList(),
                g.DayOfWeek,        // legacy fallback
                g.ScheduleStart,    // legacy fallback
                ClientIds = g.Clients.Select(c => c.Id).ToList()
            })
            .ToListAsync(token);

        foreach (var g in groups)
        {
            var slots = g.Slots.Count > 0
                ? g.Slots.Select(s => (s.DayOfWeek, s.StartMin)).ToList()
                : new List<(string DayOfWeek, int StartMin)> { (g.DayOfWeek, (int)g.ScheduleStart.TimeOfDay.TotalMinutes) };

            foreach (var slot in slots)
            {
                if (!Enum.TryParse<DayOfWeek>(slot.DayOfWeek, true, out var dow)) continue;
                if (now.DayOfWeek != dow) continue;
                var occurrence = now.Date.AddMinutes(slot.StartMin);
                if (occurrence < from || occurrence >= to) continue;
                foreach (var clientId in g.ClientIds)
                    await notifier.SendAttendanceReminderAsync(clientId, g.Name, occurrence);
            }
        }

        if (sessions.Count > 0 || groups.Count > 0)
            _logger.LogInformation("Class reminders processed at {Now}", now);
    }
}
