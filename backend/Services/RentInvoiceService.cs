using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Services;

/// <summary>
/// Background worker that bills rent monthly. Each hourly tick "ensures" every
/// active tenant (MonthlyRate > 0, contract overlapping the month) has exactly
/// one RentalInvoice for the current gym-local month — so the 1st-of-month run,
/// catch-up after downtime, and a tenant activated mid-month all fall out of
/// the same idempotent check. Also flips pending → overdue past DueDate.
/// Month boundaries are gym-local (Gym:TimeZone) converted to UTC instants;
/// membership per month is decided by PeriodStart ∈ [monthStartUtc, monthEndUtc)
/// (range check, not equality — robust to TZ rule changes).
/// </summary>
public class RentInvoiceService : BackgroundService
{
    private const int DueDays = 10;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IGymTimeService _gymTime;
    private readonly ILogger<RentInvoiceService> _logger;

    public RentInvoiceService(IServiceScopeFactory scopeFactory, IGymTimeService gymTime, ILogger<RentInvoiceService> logger)
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
                _logger.LogError(ex, "RentInvoiceService tick failed");
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

        var localNow = _gymTime.LocalNow;
        var monthStartLocal = new DateTime(localNow.Year, localNow.Month, 1, 0, 0, 0, DateTimeKind.Unspecified);
        var monthStartUtc = TimeZoneInfo.ConvertTimeToUtc(monthStartLocal, _gymTime.TimeZone);
        var monthEndUtc = TimeZoneInfo.ConvertTimeToUtc(monthStartLocal.AddMonths(1), _gymTime.TimeZone);

        var tenants = await context.TrainerTenants
            .Where(t => t.ContractStatus == "active"
                        && t.MonthlyRate > 0
                        && t.ContractStart < monthEndUtc
                        && (t.ContractEnd == null || t.ContractEnd >= monthStartUtc))
            .Select(t => new { t.Id, t.MonthlyRate })
            .ToListAsync(token);

        var tenantIds = tenants.Select(t => t.Id).ToList();
        var alreadyBilled = await context.RentalInvoices
            .Where(i => tenantIds.Contains(i.TrainerTenantId)
                        && i.PeriodStart >= monthStartUtc && i.PeriodStart < monthEndUtc)
            .Select(i => i.TrainerTenantId)
            .ToListAsync(token);
        var billed = alreadyBilled.ToHashSet();

        var created = 0;
        foreach (var tenant in tenants.Where(t => !billed.Contains(t.Id)))
        {
            context.RentalInvoices.Add(new RentalInvoice
            {
                TrainerTenantId = tenant.Id,
                InvoiceNumber = DocumentNumbers.Rent(),
                Amount = tenant.MonthlyRate,
                PeriodStart = monthStartUtc,
                PeriodEnd = monthEndUtc,
                DueDate = monthStartUtc.AddDays(DueDays),
                Status = "pending"
            });
            created++;
        }

        // Flip past-due rent to overdue so balances and badges read correctly.
        var nowUtc = DateTime.UtcNow;
        var overdue = await context.RentalInvoices
            .Where(i => i.Status == "pending" && i.DueDate < nowUtc)
            .ToListAsync(token);
        foreach (var invoice in overdue)
        {
            invoice.Status = "overdue";
            invoice.UpdatedAt = nowUtc;
        }

        if (created > 0 || overdue.Count > 0)
        {
            await context.SaveChangesAsync(token);
            _logger.LogInformation("RentInvoiceService: {Created} rent invoice(s) created, {Overdue} marked overdue", created, overdue.Count);
        }
    }
}
