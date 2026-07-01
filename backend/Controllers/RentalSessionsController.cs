using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

// Concrete dated sessions for a qiragji's (TrainerTenant's) recurring weekly schedule.
// Mirrors GroupSessionsController: generate a month of sessions from the weekly slots,
// then cancel / postpone / mark held — this is what puts rentals on the calendar
// the same way training groups are.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RentalSessionsController : ControllerBase
{
    private readonly FitnessContext _context;

    public RentalSessionsController(FitnessContext context)
    {
        _context = context;
    }

    private static readonly string[] Days =
        { "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" };

    private int? CurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return int.TryParse(claim?.Value, out var id) ? id : null;
    }

    private bool IsAdmin() => User.IsInRole("Admin") || User.IsInRole("GymOwner");

    private async Task<int?> ResolveTenantIdAsync(int? requestedTenantId)
    {
        if (IsAdmin())
            return requestedTenantId; // admin may view all (null) or filter by a specific tenant

        var userId = CurrentUserId();
        if (userId == null) return null;
        var own = await _context.TrainerTenants.FirstOrDefaultAsync(t => t.UserId == userId);
        return own?.Id; // a qiragji only ever sees their own sessions, regardless of query param
    }

    // GET: api/rentalsessions?tenantId=1&year=2026&month=7
    [HttpGet]
    public async Task<IActionResult> GetSessions([FromQuery] int? tenantId, [FromQuery] int? year, [FromQuery] int? month)
    {
        if (!IsAdmin())
        {
            var ownId = await ResolveTenantIdAsync(tenantId);
            if (ownId == null) return Forbid();
            tenantId = ownId;
        }

        year ??= DateTime.UtcNow.Year;
        month ??= DateTime.UtcNow.Month;
        var start = new DateTime(year.Value, month.Value, 1);
        var end = start.AddMonths(1);

        var query = _context.RentalSessions
            .Include(s => s.TrainerTenant).ThenInclude(t => t.User)
            .Where(s => s.Date >= start && s.Date < end);

        if (tenantId.HasValue)
            query = query.Where(s => s.TrainerTenantId == tenantId.Value);

        var sessions = await query
            .OrderBy(s => s.Date).ThenBy(s => s.StartMin)
            .Select(s => new
            {
                s.Id,
                s.TrainerTenantId,
                TenantName = s.TrainerTenant.BusinessName,
                s.Date,
                s.DayOfWeek,
                s.StartMin,
                s.EndMin,
                s.Status,
                s.Reason,
                s.PostponedToDate
            })
            .ToListAsync();

        return Ok(sessions);
    }

    // POST: api/rentalsessions/generate
    // Materializes every weekly RentalScheduleSlot into dated RentalSession rows for the
    // given month. Idempotent: existing sessions for the same tenant/date/slot are kept.
    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] GenerateRentalSessionsRequest request)
    {
        var tenantId = await ResolveTenantIdAsync(request.TenantId);
        if (tenantId == null) return Forbid();

        if (request.Month < 1 || request.Month > 12)
            return BadRequest(new { message = "Muaj i pavlefshëm" });
        if (request.Year < 2000 || request.Year > DateTime.UtcNow.Year + 1)
            return BadRequest(new { message = "Vit i pavlefshëm" });

        var tenant = await _context.TrainerTenants
            .Include(t => t.ScheduleSlots)
            .FirstOrDefaultAsync(t => t.Id == tenantId.Value);
        if (tenant == null) return NotFound(new { message = "Qiragjia nuk u gjet" });
        if (tenant.ScheduleSlots.Count == 0)
            return BadRequest(new { message = "Qiragjia s'ka orar javor të konfiguruar" });

        var start = new DateTime(request.Year, request.Month, 1);
        var daysInMonth = DateTime.DaysInMonth(request.Year, request.Month);

        var existing = await _context.RentalSessions
            .Where(s => s.TrainerTenantId == tenant.Id && s.Date >= start && s.Date < start.AddMonths(1))
            .ToListAsync();

        int created = 0;
        for (int day = 0; day < daysInMonth; day++)
        {
            var date = start.AddDays(day);
            var dayName = Days[(int)date.DayOfWeek];
            foreach (var slot in tenant.ScheduleSlots.Where(s => s.DayOfWeek == dayName))
            {
                bool already = existing.Any(e => e.Date.Date == date.Date && e.StartMin == slot.StartMin);
                if (already) continue;

                _context.RentalSessions.Add(new RentalSession
                {
                    TrainerTenantId = tenant.Id,
                    Date = date,
                    DayOfWeek = dayName,
                    StartMin = slot.StartMin,
                    EndMin = slot.EndMin,
                    Status = "scheduled"
                });
                created++;
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = $"U gjeneruan {created} seanca", created });
    }

    private async Task<RentalSession?> LoadOwnSessionAsync(int id)
    {
        var session = await _context.RentalSessions.FindAsync(id);
        if (session == null) return null;
        if (IsAdmin()) return session;

        var ownId = await ResolveTenantIdAsync(null);
        return ownId == session.TrainerTenantId ? session : null;
    }

    // POST: api/rentalsessions/{id}/cancel
    [HttpPost("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id, [FromBody] RentalSessionReasonRequest request)
    {
        var session = await LoadOwnSessionAsync(id);
        if (session == null) return NotFound();
        session.Status = "cancelled";
        session.Reason = request.Reason?.Trim();
        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Seanca u anulua" });
    }

    // POST: api/rentalsessions/{id}/postpone
    [HttpPost("{id:int}/postpone")]
    public async Task<IActionResult> Postpone(int id, [FromBody] RentalSessionPostponeRequest request)
    {
        var session = await LoadOwnSessionAsync(id);
        if (session == null) return NotFound();
        if (request.NewDate == default)
            return BadRequest(new { message = "Kërkohet datë e re" });
        session.Status = "postponed";
        session.PostponedToDate = request.NewDate;
        session.Reason = request.Reason?.Trim();
        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Seanca u shty" });
    }

    // POST: api/rentalsessions/{id}/mark-held
    [HttpPost("{id:int}/mark-held")]
    public async Task<IActionResult> MarkHeld(int id)
    {
        var session = await LoadOwnSessionAsync(id);
        if (session == null) return NotFound();
        session.Status = "held";
        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Seanca u shënua e mbajtur" });
    }

    // POST: api/rentalsessions/{id}/reset — undo cancel/postpone back to scheduled.
    [HttpPost("{id:int}/reset")]
    public async Task<IActionResult> Reset(int id)
    {
        var session = await LoadOwnSessionAsync(id);
        if (session == null) return NotFound();
        session.Status = "scheduled";
        session.Reason = null;
        session.PostponedToDate = null;
        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Seanca u rikthye" });
    }
}

public class GenerateRentalSessionsRequest
{
    public int? TenantId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
}

public class RentalSessionReasonRequest
{
    [MaxLength(500)] public string? Reason { get; set; }
}

public class RentalSessionPostponeRequest
{
    public DateTime NewDate { get; set; }
    [MaxLength(500)] public string? Reason { get; set; }
}
