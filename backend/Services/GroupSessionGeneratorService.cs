using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Services;

/// <summary>
/// Background worker (2026-07-03) that auto-materializes GroupSession rows from
/// each group's weekly GroupScheduleSlot template, so admin/trainer no longer has
/// to remember to click "Gjenero seancat" in AdminGroups every month. Runs daily
/// and keeps a rolling ~5-week horizon of dated sessions ready ahead of time, so
/// the client calendar, trainer QR self check-in, cancel/postpone/substitute
/// actions, and commission calculations always have concrete rows to work with
/// instead of relying on the AccessController's on-the-fly self-heal.
/// Idempotent per (TrainingGroupId, Date, StartMin) — safe to re-run every tick,
/// and safe to run alongside the manual POST /api/groupsessions/generate endpoint.
/// </summary>
public class GroupSessionGeneratorService : BackgroundService
{
    private const int HorizonDays = GroupSessionGenerator.DefaultHorizonDays; // ~5 weeks ahead, rolling

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IGymTimeService _gymTime;
    private readonly ILogger<GroupSessionGeneratorService> _logger;

    public GroupSessionGeneratorService(IServiceScopeFactory scopeFactory, IGymTimeService gymTime, ILogger<GroupSessionGeneratorService> logger)
    {
        _scopeFactory = scopeFactory;
        _gymTime = gymTime;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Small startup delay so the app finishes booting/migrating first.
        try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); } catch (OperationCanceledException) { return; }

        using var timer = new PeriodicTimer(TimeSpan.FromHours(24));
        do
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GroupSessionGeneratorService tick failed");
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
        var context = scope.ServiceProvider.GetRequiredService<FitnessContext>();

        var todayLocal = _gymTime.LocalNow.Date;

        var groups = await context.TrainingGroups
            .Include(g => g.ScheduleSlots)
            .Where(g => g.ScheduleSlots.Any())
            .ToListAsync(token);

        if (groups.Count == 0) return;

        var created = 0;
        foreach (var group in groups)
            created += await GroupSessionGenerator.GenerateForGroupAsync(context, group, todayLocal, HorizonDays);

        if (created > 0)
        {
            await context.SaveChangesAsync(token);
            _logger.LogInformation(
                "GroupSessionGeneratorService: {Created} session(s) auto-generated through {Horizon:yyyy-MM-dd}",
                created, todayLocal.AddDays(HorizonDays));
        }
    }
}
