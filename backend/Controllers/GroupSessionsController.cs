using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

// Concrete dated sessions for a group (GAP-3, GAP-4, GAP-10).
// Lets admin/trainer generate a month of sessions from the weekly slots and then
// cancel / postpone / assign a substitute / mark held, plus trainer self check-in.
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminTrainer")]
public class GroupSessionsController : ControllerBase
{
    private readonly FitnessContext _context;

    public GroupSessionsController(FitnessContext context)
    {
        _context = context;
    }

    private static readonly string[] Days =
        { "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" };

    // GET: api/groupsessions?groupId=1&year=2026&month=6
    [HttpGet]
    public async Task<IActionResult> GetSessions([FromQuery] int? groupId, [FromQuery] int? year, [FromQuery] int? month)
    {
        year ??= DateTime.UtcNow.Year;
        month ??= DateTime.UtcNow.Month;
        var start = new DateTime(year.Value, month.Value, 1);
        var end = start.AddMonths(1);

        var query = _context.GroupSessions
            .Include(s => s.TrainingGroup).ThenInclude(g => g.Trainer).ThenInclude(t => t.User)
            .Include(s => s.SubstituteTrainer).ThenInclude(t => t!.User)
            .Where(s => s.Date >= start && s.Date < end);

        if (groupId.HasValue)
            query = query.Where(s => s.TrainingGroupId == groupId.Value);

        var sessions = await query
            .OrderBy(s => s.Date).ThenBy(s => s.StartMin)
            .Select(s => new
            {
                s.Id,
                s.TrainingGroupId,
                GroupName = s.TrainingGroup.Name,
                s.Date,
                s.DayOfWeek,
                s.StartMin,
                s.EndMin,
                s.Status,
                s.Reason,
                s.PostponedToDate,
                s.SubstituteTrainerId,
                SubstituteTrainer = s.SubstituteTrainer != null ? s.SubstituteTrainer.User.Name : null,
                s.TrainerCheckedIn,
                s.TrainerCheckInTime
            })
            .ToListAsync();

        return Ok(sessions);
    }

    // POST: api/groupsessions/generate
    // Materializes every weekly slot of a group into dated GroupSession rows for the
    // given month. Idempotent: existing sessions for the same group/date/slot are kept.
    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] GenerateSessionsRequest request)
    {
        if (request.Month < 1 || request.Month > 12)
            return BadRequest(new { message = "Invalid month" });
        if (request.Year < 2000 || request.Year > DateTime.UtcNow.Year + 1)
            return BadRequest(new { message = "Invalid year" });

        var group = await _context.TrainingGroups
            .Include(g => g.ScheduleSlots)
            .FirstOrDefaultAsync(g => g.Id == request.GroupId);
        if (group == null) return NotFound(new { message = "Group not found" });
        if (group.ScheduleSlots.Count == 0)
            return BadRequest(new { message = "Group has no weekly schedule slots" });

        var start = new DateTime(request.Year, request.Month, 1);
        var daysInMonth = DateTime.DaysInMonth(request.Year, request.Month);

        var existing = await _context.GroupSessions
            .Where(s => s.TrainingGroupId == group.Id && s.Date >= start && s.Date < start.AddMonths(1))
            .ToListAsync();

        int created = 0;
        for (int day = 0; day < daysInMonth; day++)
        {
            var date = start.AddDays(day);
            var dayName = Days[(int)date.DayOfWeek];
            foreach (var slot in group.ScheduleSlots.Where(s => s.DayOfWeek == dayName))
            {
                bool already = existing.Any(e => e.Date.Date == date.Date && e.StartMin == slot.StartMin);
                if (already) continue;

                _context.GroupSessions.Add(new GroupSession
                {
                    TrainingGroupId = group.Id,
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
        return Ok(new { message = $"Generated {created} session(s)", created });
    }

    // POST: api/groupsessions/{id}/cancel
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id, [FromBody] SessionReasonRequest request)
    {
        var session = await _context.GroupSessions.FindAsync(id);
        if (session == null) return NotFound();
        session.Status = "cancelled";
        session.Reason = request.Reason?.Trim();
        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Session cancelled" });
    }

    // POST: api/groupsessions/{id}/postpone
    [HttpPost("{id}/postpone")]
    public async Task<IActionResult> Postpone(int id, [FromBody] PostponeRequest request)
    {
        var session = await _context.GroupSessions.FindAsync(id);
        if (session == null) return NotFound();
        if (request.NewDate == default)
            return BadRequest(new { message = "A new date is required" });
        session.Status = "postponed";
        session.PostponedToDate = request.NewDate;
        session.Reason = request.Reason?.Trim();
        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Session postponed" });
    }

    // POST: api/groupsessions/{id}/substitute
    [HttpPost("{id}/substitute")]
    public async Task<IActionResult> Substitute(int id, [FromBody] SubstituteRequest request)
    {
        var session = await _context.GroupSessions.FindAsync(id);
        if (session == null) return NotFound();
        if (request.SubstituteTrainerId.HasValue)
        {
            var exists = await _context.Trainers.AnyAsync(t => t.Id == request.SubstituteTrainerId.Value);
            if (!exists) return BadRequest(new { message = "Substitute trainer not found" });
        }
        session.SubstituteTrainerId = request.SubstituteTrainerId;
        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Substitute updated" });
    }

    // POST: api/groupsessions/{id}/mark-held
    [HttpPost("{id}/mark-held")]
    public async Task<IActionResult> MarkHeld(int id)
    {
        var session = await _context.GroupSessions.FindAsync(id);
        if (session == null) return NotFound();
        session.Status = "held";
        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Session marked as held" });
    }

    // POST: api/groupsessions/{id}/trainer-checkin
    // Trainer self-scan (GAP-4): confirms the session ran. Marks held + records the time.
    [HttpPost("{id}/trainer-checkin")]
    public async Task<IActionResult> TrainerCheckin(int id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userId, out var uid)) return Unauthorized();

        var session = await _context.GroupSessions
            .Include(s => s.TrainingGroup).ThenInclude(g => g.Trainer)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (session == null) return NotFound();

        // Only the group's trainer, the assigned substitute, or an admin may check in.
        var isAdmin = User.IsInRole("Admin") || User.IsInRole("GymOwner");
        var ownTrainer = await _context.Trainers.FirstOrDefaultAsync(t => t.UserId == uid);
        if (!isAdmin)
        {
            bool isGroupTrainer = ownTrainer != null && session.TrainingGroup.TrainerId == ownTrainer.Id;
            bool isSubstitute = ownTrainer != null && session.SubstituteTrainerId == ownTrainer.Id;
            if (!isGroupTrainer && !isSubstitute)
                return Forbid();
        }

        session.TrainerCheckedIn = true;
        session.TrainerCheckInTime = DateTime.UtcNow;
        session.Status = "held";
        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Checked in. Session marked as held." });
    }

    // POST: api/groupsessions/{id}/reset — undo cancel/postpone back to scheduled.
    [HttpPost("{id}/reset")]
    public async Task<IActionResult> Reset(int id)
    {
        var session = await _context.GroupSessions.FindAsync(id);
        if (session == null) return NotFound();
        session.Status = "scheduled";
        session.Reason = null;
        session.PostponedToDate = null;
        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Session reset to scheduled" });
    }
}

public class GenerateSessionsRequest
{
    public int GroupId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
}

public class SessionReasonRequest
{
    [MaxLength(500)] public string? Reason { get; set; }
}

public class PostponeRequest
{
    public DateTime NewDate { get; set; }
    [MaxLength(500)] public string? Reason { get; set; }
}

public class SubstituteRequest
{
    public int? SubstituteTrainerId { get; set; }
}
