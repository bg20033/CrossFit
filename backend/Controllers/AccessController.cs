using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using StandUpFitness.Data;
using StandUpFitness.Models;
using StandUpFitness.Services;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AccessScan")]
public class AccessController : ControllerBase
{
    private readonly FitnessContext _context;
    private readonly IGymTimeService _gymTime;
    private static readonly System.Text.RegularExpressions.Regex QrTokenPattern =
        new(@"SUCF-[A-Z0-9-]{8,}", System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Compiled);

    public AccessController(FitnessContext context, IGymTimeService gymTime)
    {
        _context = context;
        _gymTime = gymTime;
    }

    private static string NormalizeQrToken(string input)
    {
        var raw = input.Trim();
        if (Uri.TryCreate(raw, UriKind.Absolute, out var uri))
        {
            var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(uri.Query);
            foreach (var key in new[] { "token", "qr", "code" })
            {
                if (query.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value.FirstOrDefault()))
                    return value.First()!.Trim().ToUpperInvariant();
            }

            var pathMatch = QrTokenPattern.Match(uri.AbsolutePath);
            if (pathMatch.Success) return pathMatch.Value.ToUpperInvariant();
        }

        var match = QrTokenPattern.Match(raw);
        return (match.Success ? match.Value : raw).Trim().ToUpperInvariant();
    }

    // POST /api/access/scan
    // Server-side QR access verdict: payment + group + time window + capacity.
    [HttpPost("scan")]
    public async Task<IActionResult> Scan([FromBody] AccessScanRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
            return BadRequest(new { message = "Tokeni i QR mungon." });

        var token = NormalizeQrToken(request.Token);
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "Tokeni i QR mungon." });
        // Schedule slots are gym wall-clock times, so the verdict is computed in
        // the gym's timezone — DateTime.Now was wrong the moment the API ran on a
        // UTC server (an 18:00 class would reject check-ins at 18:00 local).
        // Persisted timestamps stay UTC.
        var now = _gymTime.LocalNow;
        var utcNow = DateTime.UtcNow;
        var scannerId = User.CurrentUserId();

        var member = await _context.Clients
            .Include(c => c.User)
            .Include(c => c.Groups)
                .ThenInclude(g => g.ScheduleSlots)
            .FirstOrDefaultAsync(c => c.QrToken != null && c.QrToken.ToUpper() == token);

        var activeLog = member == null
            ? null
            : await _context.AttendanceLogs
                .Where(a => a.ClientId == member.Id && a.CheckOutTime == null && a.Decision == "granted")
                .OrderByDescending(a => a.CheckInTime)
                .FirstOrDefaultAsync();

        TrainingGroup? groupNow = null;
        GroupScheduleSlot? slotNow = null;
        if (member != null)
            (groupNow, slotNow) = AccessDecisionService.ScheduledNow(member.Groups, now);

        var inGymCount = await _context.AttendanceLogs.CountAsync(a => a.CheckOutTime == null && a.Decision == "granted");
        var capacity = groupNow?.MaxCapacity > 0 ? groupNow.MaxCapacity : AccessDecisionService.DefaultCapacity;
        var verdict = AccessDecisionService.Decide(member, groupNow, slotNow, inGymCount, capacity, activeLog != null, now);

        AttendanceLog? savedLog = null;
        if (member != null)
        {
            if (verdict.Action == "entry")
            {
                savedLog = new AttendanceLog
                {
                    ClientId = member.Id,
                    CheckInTime = utcNow,
                    CheckInMethod = "qr",
                    Decision = verdict.Decision,
                    GroupId = groupNow?.Id,
                    ScannedById = scannerId
                };
                _context.AttendanceLogs.Add(savedLog);
            }
            else if (verdict.Action == "exit" && activeLog != null)
            {
                activeLog.CheckOutTime = utcNow;
                activeLog.Decision = "exit";
                activeLog.ScannedById = scannerId;
                savedLog = activeLog;
            }
            else
            {
                savedLog = new AttendanceLog
                {
                    ClientId = member.Id,
                    CheckInTime = utcNow,
                    CheckInMethod = "qr",
                    Decision = verdict.Decision,
                    DenyReason = verdict.Reason,
                    GroupId = groupNow?.Id,
                    ScannedById = scannerId,
                    Notes = "Denied access scan"
                };
                _context.AttendanceLogs.Add(savedLog);
            }

            await _context.SaveChangesAsync();
        }

        return Ok(new
        {
            verdict.Decision,
            verdict.Action,
            verdict.Reason,
            member = member == null ? null : new
            {
                member.Id,
                member.User.Name,
                member.MembershipType,
                member.MembershipExpiry,
                member.IsActive
            },
            group = groupNow == null ? null : new
            {
                groupNow.Id,
                groupNow.Name,
                groupNow.MaxCapacity,
                remainingMin = AccessDecisionService.RemainingMin(slotNow!, now)
            },
            inGymCount = verdict.Action == "entry" ? inGymCount + 1 : Math.Max(0, inGymCount - (verdict.Action == "exit" ? 1 : 0)),
            capacity,
            logId = savedLog?.Id,
            scannedAt = now
        });
    }

    // GET /api/access/live
    [HttpGet("live")]
    public async Task<IActionResult> Live()
    {
        var active = await _context.AttendanceLogs
            .Where(a => a.CheckOutTime == null && a.Decision == "granted")
            .OrderByDescending(a => a.CheckInTime)
            .Select(a => new
            {
                a.Id,
                a.ClientId,
                a.Client.User.Name,
                a.GroupId,
                a.CheckInTime
            })
            .ToListAsync();

        // "Today" is the gym's local day converted to a UTC range — timestamps
        // are stored in UTC.
        var (todayStartUtc, todayEndUtc) = _gymTime.LocalDayUtcRange();
        var entriesToday = await _context.AttendanceLogs.CountAsync(a =>
            a.CheckInTime >= todayStartUtc && a.CheckInTime < todayEndUtc && a.Decision == "granted");
        var denialsToday = await _context.AttendanceLogs.CountAsync(a =>
            a.CheckInTime >= todayStartUtc && a.CheckInTime < todayEndUtc && a.Decision == "denied");

        return Ok(new
        {
            inGymCount = active.Count,
            entriesToday,
            denialsToday,
            capacity = AccessDecisionService.DefaultCapacity,
            active
        });
    }
}

public class AccessScanRequest
{
    [Required, MaxLength(256)]
    public string Token { get; set; } = null!;
}
