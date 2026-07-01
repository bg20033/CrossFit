using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly FitnessContext _context;

    public AttendanceController(FitnessContext context)
    {
        _context = context;
    }

    private async Task<bool> CanAccessClientAsync(int clientId)
    {
        if (User.IsInRole("Admin") || User.IsInRole("GymOwner") || User.IsInRole("Trainer") || User.IsInRole("Staff"))
            return true;
        var uid = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(uid, out var userId)) return false;
        var own = await _context.Clients.Where(c => c.UserId == userId).Select(c => (int?)c.Id).FirstOrDefaultAsync();
        return own == clientId;
    }

    private static readonly string[] Weekdays =
        { "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" };

    private static DateTime StartOfWeek(DateTime d)
    {
        int diff = ((int)d.DayOfWeek + 6) % 7; // Monday-based
        return d.Date.AddDays(-diff);
    }

    // POST: api/attendance/batch  — trainer/admin marks a whole group present/absent at once
    [HttpPost("batch")]
    [Authorize(Policy = "AdminTrainer")]
    public async Task<IActionResult> BatchCheckIn([FromBody] BatchAttendanceRequest request)
    {
        if (request.ClientIds == null || request.ClientIds.Count == 0)
            return BadRequest(new { message = "No clients provided" });

        var date = (request.Date ?? DateTime.UtcNow).Date;
        var added = 0;
        var updated = 0;
        foreach (var clientId in request.ClientIds.Distinct())
        {
            var existing = await _context.Attendance.FirstOrDefaultAsync(a =>
                a.ClientId == clientId && a.GroupId == request.GroupId && a.AttendanceDate == date);
            if (existing == null)
            {
                _context.Attendance.Add(new Attendance
                {
                    ClientId = clientId,
                    GroupId = request.GroupId,
                    AttendanceDate = date,
                    IsPresent = request.IsPresent
                });
                added++;
            }
            else
            {
                existing.IsPresent = request.IsPresent;
                updated++;
            }
        }
        await _context.SaveChangesAsync();
        return Ok(new { added, updated, date });
    }

    // GET: api/attendance/client-summary?clientId=1&year=2026&month=6
    [HttpGet("client-summary")]
    public async Task<IActionResult> ClientSummary([FromQuery] int clientId, [FromQuery] int? year, [FromQuery] int? month)
    {
        if (!await CanAccessClientAsync(clientId)) return Forbid();
        year ??= DateTime.UtcNow.Year;
        month ??= DateTime.UtcNow.Month;
        var monthStart = new DateTime(year.Value, month.Value, 1);
        var monthEnd = monthStart.AddMonths(1);

        var all = await _context.AttendanceLogs
            .Where(a => a.ClientId == clientId)
            .Select(a => new { a.CheckInTime, a.CheckOutTime })
            .ToListAsync();

        var today = DateTime.UtcNow.Date;
        var weekStart = StartOfWeek(today);
        var attendedDates = all.Select(a => a.CheckInTime.Date).ToHashSet();

        // current streak (consecutive days up to today/yesterday)
        int streak = 0;
        var cursor = attendedDates.Contains(today) ? today : today.AddDays(-1);
        while (attendedDates.Contains(cursor)) { streak++; cursor = cursor.AddDays(-1); }

        var monthLogs = all.Where(a => a.CheckInTime >= monthStart && a.CheckInTime < monthEnd).ToList();
        var days = monthLogs
            .GroupBy(a => a.CheckInTime.Date)
            .Select(g => new
            {
                date = g.Key.ToString("yyyy-MM-dd"),
                count = g.Count(),
                minutes = g.Where(x => x.CheckOutTime.HasValue).Sum(x => (x.CheckOutTime!.Value - x.CheckInTime).TotalMinutes)
            })
            .OrderBy(d => d.date)
            .ToList();

        var elapsedDays = (month.Value == today.Month && year.Value == today.Year) ? today.Day : DateTime.DaysInMonth(year.Value, month.Value);
        var attendedDistinctThisMonth = monthLogs.Select(a => a.CheckInTime.Date).Distinct().Count();

        return Ok(new
        {
            year,
            month,
            totalAllTime = all.Count,
            totalThisMonth = monthLogs.Count,
            totalThisWeek = all.Count(a => a.CheckInTime.Date >= weekStart && a.CheckInTime.Date <= today),
            attendedDaysThisMonth = attendedDistinctThisMonth,
            attendanceRate = elapsedDays > 0 ? Math.Round((double)attendedDistinctThisMonth / elapsedDays * 100, 0) : 0,
            currentStreak = streak,
            days
        });
    }

    // GET: api/attendance/overview?year=2026&month=6  (facility-wide, admin/trainer)
    [Authorize(Policy = "AdminTrainer")]
    [HttpGet("overview")]
    public async Task<IActionResult> Overview([FromQuery] int? year, [FromQuery] int? month)
    {
        year ??= DateTime.UtcNow.Year;
        month ??= DateTime.UtcNow.Month;
        var monthStart = new DateTime(year.Value, month.Value, 1);
        var monthEnd = monthStart.AddMonths(1);

        var logs = await _context.AttendanceLogs
            .Where(a => a.CheckInTime >= monthStart && a.CheckInTime < monthEnd)
            .Select(a => new { a.CheckInTime, a.CheckOutTime, a.ClientId })
            .ToListAsync();

        var today = DateTime.UtcNow.Date;
        var weekStart = StartOfWeek(today);

        var days = logs
            .GroupBy(a => a.CheckInTime.Date)
            .Select(g => new
            {
                date = g.Key.ToString("yyyy-MM-dd"),
                count = g.Count(),
                minutes = g.Where(x => x.CheckOutTime.HasValue).Sum(x => (x.CheckOutTime!.Value - x.CheckInTime).TotalMinutes)
            })
            .OrderBy(d => d.date)
            .ToList();

        var byWeekday = Weekdays.ToDictionary(
            wd => wd,
            wd => logs.Count(a => a.CheckInTime.DayOfWeek.ToString() == wd));

        var totalMinutes = logs.Where(a => a.CheckOutTime.HasValue).Sum(a => (a.CheckOutTime!.Value - a.CheckInTime).TotalMinutes);
        var busiest = byWeekday.OrderByDescending(kv => kv.Value).FirstOrDefault();

        return Ok(new
        {
            year,
            month,
            totalVisitsMonth = logs.Count,
            totalHoursMonth = Math.Round(totalMinutes / 60.0, 1),
            totalVisitsWeek = logs.Count(a => a.CheckInTime.Date >= weekStart && a.CheckInTime.Date <= today),
            uniqueMembersMonth = logs.Select(a => a.ClientId).Distinct().Count(),
            busiestDay = busiest.Value > 0 ? busiest.Key : null,
            byWeekday,
            days
        });
    }
}

public class BatchAttendanceRequest
{
    public int? GroupId { get; set; }
    public DateTime? Date { get; set; }
    public bool IsPresent { get; set; } = true;
    public List<int> ClientIds { get; set; } = new();
}
