using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;
using StandUpFitness.Data;
using StandUpFitness.Models;
using StandUpFitness.Services;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/calendar")]
[Authorize]
public class CalendarController : ControllerBase
{
    private readonly FitnessContext _context;

    public CalendarController(FitnessContext context)
    {
        _context = context;
    }

    [Authorize(Policy = "AdminTrainer")]
    [HttpGet("groups.ics")]
    public async Task<IActionResult> GroupsIcs([FromQuery] int weeks = 8)
    {
        IQueryable<TrainingGroup> query = _context.TrainingGroups
            .Include(g => g.Trainer).ThenInclude(t => t.User)
            .Include(g => g.ScheduleSlots)
            .AsNoTracking();

        if (!User.CanManageCoreScope(permission: "schedule.write"))
        {
            var trainerId = await _context.CurrentCoreTrainerIdAsync(User);
            if (trainerId == null) return Forbid();
            query = query.Where(g => g.TrainerId == trainerId.Value);
        }

        var groups = await query.ToListAsync();
        return IcsFile(groups.SelectMany(g => GroupEvents(
            g, $"group-{g.Id}", $"{g.Trainer.User.Name} · Kapaciteti {g.MaxCapacity}", weeks
        )), "standup-groups.ics");
    }

    [Authorize(Policy = "ClientArea")]
    [HttpGet("me.ics")]
    public async Task<IActionResult> MyIcs([FromQuery] int weeks = 8)
    {
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();

        var client = await _context.Clients
            .Include(c => c.Groups)
                .ThenInclude(g => g.Trainer)
                    .ThenInclude(t => t.User)
            .Include(c => c.Groups)
                .ThenInclude(g => g.ScheduleSlots)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.UserId == userId);
        if (client == null) return NotFound("Client profile not found");

        return IcsFile(client.Groups.SelectMany(g => GroupEvents(
            g, $"client-{client.Id}-group-{g.Id}", $"{g.Trainer.User.Name} · Stand Up CrossFit", weeks
        )), "standup-my-calendar.ics");
    }

    private IActionResult IcsFile(IEnumerable<IcsEvent> events, string filename)
    {
        var sb = new StringBuilder();
        sb.AppendLine("BEGIN:VCALENDAR");
        sb.AppendLine("VERSION:2.0");
        sb.AppendLine("PRODID:-//Stand Up CrossFit//Gym Calendar//SQ");
        sb.AppendLine("CALSCALE:GREGORIAN");
        foreach (var e in events)
        {
            var end = e.StartsAt.Add(e.Duration <= TimeSpan.Zero ? TimeSpan.FromMinutes(80) : e.Duration);
            sb.AppendLine("BEGIN:VEVENT");
            sb.AppendLine($"UID:{Escape(e.Uid)}@standupcrossfit");
            sb.AppendLine($"DTSTAMP:{DateTime.UtcNow:yyyyMMddTHHmmssZ}");
            sb.AppendLine($"DTSTART:{e.StartsAt.ToUniversalTime():yyyyMMddTHHmmssZ}");
            sb.AppendLine($"DTEND:{end.ToUniversalTime():yyyyMMddTHHmmssZ}");
            sb.AppendLine($"SUMMARY:{Escape(e.Summary)}");
            sb.AppendLine($"DESCRIPTION:{Escape(e.Description)}");
            if (!string.IsNullOrWhiteSpace(e.RRule)) sb.AppendLine(e.RRule);
            sb.AppendLine("END:VEVENT");
        }
        sb.AppendLine("END:VCALENDAR");
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/calendar; charset=utf-8", filename);
    }

    // One recurring VEVENT per weekly slot of the group.
    private static IEnumerable<IcsEvent> GroupEvents(TrainingGroup g, string uidPrefix, string description, int weeks)
    {
        var rrule = $"RRULE:FREQ=WEEKLY;COUNT={Math.Clamp(weeks, 1, 52)}";
        return AccessDecisionService.EffectiveSlots(g).Select(s => new IcsEvent(
            $"{uidPrefix}-{s.DayOfWeek}-{s.StartMin}",
            g.Name,
            description,
            NextDateFor(s.DayOfWeek, s.StartMin),
            TimeSpan.FromMinutes(Math.Max(0, s.EndMin - s.StartMin)),
            rrule
        ));
    }

    private static DateTime NextDateFor(string dayOfWeek, int startMin)
    {
        var target = Enum.TryParse<DayOfWeek>(dayOfWeek, true, out var parsed) ? parsed : DateTime.Today.DayOfWeek;
        var date = DateTime.Today;
        var delta = ((int)target - (int)date.DayOfWeek + 7) % 7;
        return date.AddDays(delta).AddMinutes(startMin);
    }

    private static string Escape(string raw) =>
        raw.Replace("\\", "\\\\").Replace(",", "\\,").Replace(";", "\\;").Replace("\n", "\\n").Replace("\r", "");

    private record IcsEvent(string Uid, string Summary, string Description, DateTime StartsAt, TimeSpan Duration, string? RRule);
}
