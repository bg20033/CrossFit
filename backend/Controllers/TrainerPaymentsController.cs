using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;
using StandUpFitness.Services;

namespace StandUpFitness.Controllers;

// Trainer commissions (GAP-1 / GAP-5). Admin calculates a monthly commission per
// trainer based on the number of clients trained, prorated by sessions actually held:
//
//   prorated = (SessionsHeld / SessionsPlanned) × ClientCount × RatePerClient
//
// Paying a commission records a Finance "expense" under "Trainer Commissions".
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class TrainerPaymentsController : ControllerBase
{
    private readonly FitnessContext _context;
    private readonly IFinanceService _financeService;

    public TrainerPaymentsController(FitnessContext context, IFinanceService financeService)
    {
        _context = context;
        _financeService = financeService;
    }

    // GET: api/trainerpayments?year=2026&month=6
    [HttpGet]
    public async Task<IActionResult> GetCommissions([FromQuery] int? year, [FromQuery] int? month)
    {
        var query = _context.TrainerCommissions
            .Include(c => c.Trainer).ThenInclude(t => t.User)
            .AsQueryable();
        if (year.HasValue) query = query.Where(c => c.Year == year.Value);
        if (month.HasValue) query = query.Where(c => c.Month == month.Value);

        var rows = await query
            .OrderByDescending(c => c.Year).ThenByDescending(c => c.Month)
            .Select(c => new
            {
                c.Id,
                c.TrainerId,
                Trainer = c.Trainer.User.Name,
                Period = $"{c.Year}-{c.Month:D2}",
                c.Year,
                c.Month,
                c.ClientCount,
                c.RatePerClient,
                c.SessionsPlanned,
                c.SessionsHeld,
                c.SessionsCancelled,
                c.PaymentModel,
                c.ProratedAmount,
                c.Bonus,
                c.Deductions,
                c.TotalAmount,
                c.Status,
                c.PaidDate
            })
            .ToListAsync();

        return Ok(rows);
    }

    // GET: api/trainerpayments/summary?year=2026&month=6
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] int? year, [FromQuery] int? month)
    {
        year ??= DateTime.UtcNow.Year;
        month ??= DateTime.UtcNow.Month;
        var rows = await _context.TrainerCommissions
            .Where(c => c.Year == year && c.Month == month)
            .ToListAsync();

        return Ok(new
        {
            period = $"{year}-{month:D2}",
            totalTrainers = rows.Count,
            totalPending = rows.Where(r => r.Status == "pending").Sum(r => r.TotalAmount),
            totalPaid = rows.Where(r => r.Status == "paid").Sum(r => r.TotalAmount),
            grandTotal = rows.Sum(r => r.TotalAmount)
        });
    }

    // POST: api/trainerpayments/{trainerId}/calculate
    // Computes (or recomputes, while still pending) the trainer's commission for a period.
    [HttpPost("{trainerId}/calculate")]
    public async Task<IActionResult> Calculate(int trainerId, [FromBody] CalculateCommissionRequest request)
    {
        if (request.Month < 1 || request.Month > 12) return BadRequest(new { message = "Invalid month" });
        if (request.Year < 2000 || request.Year > DateTime.UtcNow.Year + 1) return BadRequest(new { message = "Invalid year" });
        if (request.Bonus < 0 || request.Deductions < 0) return BadRequest(new { message = "Bonus/deductions cannot be negative" });

        var trainer = await _context.Trainers.FindAsync(trainerId);
        if (trainer == null) return NotFound(new { message = "Trainer not found" });

        var existing = await _context.TrainerCommissions
            .FirstOrDefaultAsync(c => c.TrainerId == trainerId && c.Year == request.Year && c.Month == request.Month);
        if (existing != null && existing.Status == "paid")
            return BadRequest(new { message = "Commission already paid for this period" });

        // Groups this trainer owns.
        var groupIds = await _context.TrainingGroups
            .Where(g => g.TrainerId == trainerId)
            .Select(g => g.Id)
            .ToListAsync();

        // Distinct clients across those groups.
        var clientCount = groupIds.Count == 0
            ? 0
            : await _context.Clients.CountAsync(c => c.Groups.Any(g => groupIds.Contains(g.Id)));

        // Sessions in the month for those groups.
        var start = new DateTime(request.Year, request.Month, 1);
        var end = start.AddMonths(1);
        var monthSessions = groupIds.Count == 0
            ? new List<GroupSession>()
            : await _context.GroupSessions
                .Where(s => groupIds.Contains(s.TrainingGroupId) && s.Date >= start && s.Date < end)
                .ToListAsync();

        var sessionsPlanned = monthSessions.Count;
        var sessionsHeld = monthSessions.Count(s => s.Status == "held");
        var sessionsCancelled = monthSessions.Count(s => s.Status == "cancelled");

        var rate = request.RatePerClient ?? trainer.CommissionPerClient;
        var model = string.IsNullOrWhiteSpace(request.PaymentModel) ? trainer.PaymentModel : request.PaymentModel!.Trim();

        decimal prorated;
        switch (model)
        {
            case "flat":
                prorated = clientCount * rate;
                break;
            case "hourly":
                // Hourly trainers are paid through Payroll, not commission.
                prorated = 0m;
                break;
            case "prorated":
            default:
                model = "prorated";
                prorated = sessionsPlanned > 0
                    ? (decimal)sessionsHeld / sessionsPlanned * clientCount * rate
                    : clientCount * rate; // no sessions generated yet → no proration
                break;
        }

        prorated = Math.Round(prorated, 2);
        var total = prorated + request.Bonus - request.Deductions;

        var commission = existing ?? new TrainerCommission { TrainerId = trainerId, Year = request.Year, Month = request.Month };
        commission.ClientCount = clientCount;
        commission.RatePerClient = rate;
        commission.SessionsPlanned = sessionsPlanned;
        commission.SessionsHeld = sessionsHeld;
        commission.SessionsCancelled = sessionsCancelled;
        commission.PaymentModel = model;
        commission.ProratedAmount = prorated;
        commission.Bonus = request.Bonus;
        commission.Deductions = request.Deductions;
        commission.TotalAmount = total;
        commission.Status = "pending";
        commission.Notes = request.Notes?.Trim();
        commission.UpdatedAt = DateTime.UtcNow;

        if (existing == null) _context.TrainerCommissions.Add(commission);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Commission calculated",
            id = commission.Id,
            breakdown = new
            {
                clientCount,
                ratePerClient = rate,
                sessionsPlanned,
                sessionsHeld,
                sessionsCancelled,
                paymentModel = model,
                proratedAmount = prorated,
                bonus = request.Bonus,
                deductions = request.Deductions,
                totalAmount = total
            }
        });
    }

    // POST: api/trainerpayments/{id}/pay — marks paid + books a Finance expense.
    [HttpPost("{id}/pay")]
    public async Task<IActionResult> Pay(int id, [FromBody] PayCommissionRequest? request)
    {
        var commission = await _context.TrainerCommissions
            .Include(c => c.Trainer).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (commission == null) return NotFound();
        if (commission.Status == "paid") return BadRequest(new { message = "Already paid" });
        if (commission.Status == "cancelled") return BadRequest(new { message = "Commission is cancelled" });

        var userId = User.CurrentUserId();

        var finance = await _financeService.RecordExpenseAsync(
            FinanceService.TrainerCommissions,
            commission.TotalAmount,
            $"Komision trajneri — {commission.Trainer.User.Name} ({commission.Year}-{commission.Month:D2})",
            request?.PaymentMethod ?? "cash",
            userId);

        commission.Status = "paid";
        commission.PaidDate = DateTime.UtcNow;
        // Navigation instead of FinanceId: EF wires the FK, letting expense +
        // status flip commit in ONE SaveChanges (previously two — a crash in
        // between left an expense booked with the commission still pending).
        commission.Finance = finance;
        commission.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Commission paid and recorded as expense", financeId = finance.Id });
    }

    // POST: api/trainerpayments/{id}/cancel
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelCommission(int id)
    {
        var commission = await _context.TrainerCommissions.FindAsync(id);
        if (commission == null) return NotFound();
        if (commission.Status == "paid") return BadRequest(new { message = "Cannot cancel a paid commission" });
        commission.Status = "cancelled";
        commission.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Commission cancelled" });
    }

}

public class CalculateCommissionRequest
{
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal? RatePerClient { get; set; }
    public string? PaymentModel { get; set; }
    [Range(0, 1_000_000)] public decimal Bonus { get; set; } = 0;
    [Range(0, 1_000_000)] public decimal Deductions { get; set; } = 0;
    public string? Notes { get; set; }
}

public class PayCommissionRequest
{
    public string? PaymentMethod { get; set; }
}
