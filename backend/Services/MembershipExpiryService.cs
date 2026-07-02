using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;

namespace StandUpFitness.Services;

/// <summary>
/// Background worker that deactivates clients whose membership has expired
/// (IsActive=false — "Pasiv" në listë, qasja me QR bllokohet). Rinovimi i
/// riaktivizon automatikisht (InvoicePaymentService/ApplyPlanNow vendosin
/// IsActive=true kur paguhet/aplikohet pakoja) — brenda 7 ditëve grace
/// periudha e re numëron nga data e skadimit (shih MembershipDates).
/// Klientët pa datë skadimi nuk preken.
/// </summary>
public class MembershipExpiryService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MembershipExpiryService> _logger;

    public MembershipExpiryService(IServiceScopeFactory scopeFactory, ILogger<MembershipExpiryService> logger)
    {
        _scopeFactory = scopeFactory;
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
                _logger.LogError(ex, "MembershipExpiryService tick failed");
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

        var nowUtc = DateTime.UtcNow;
        var deactivated = await context.Clients
            .Where(c => c.IsActive && c.MembershipExpiry != null && c.MembershipExpiry < nowUtc)
            .ExecuteUpdateAsync(s => s
                .SetProperty(c => c.IsActive, false)
                .SetProperty(c => c.UpdatedAt, nowUtc), token);

        if (deactivated > 0)
            _logger.LogInformation("MembershipExpiryService: {Count} expired client(s) deactivated", deactivated);
    }
}
