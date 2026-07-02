using Microsoft.AspNetCore.Authorization;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;
using StandUpFitness.Services;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/leaderboard")]
[Authorize]
public class LeaderboardController : ControllerBase
{
    private readonly FitnessContext _context;
    private static readonly HashSet<string> LowerIsBetterBenchmarks = new(StringComparer.OrdinalIgnoreCase)
    {
        "fran",
        "grace",
        "helen",
        "diane",
        "murph"
    };

    public LeaderboardController(FitnessContext context) => _context = context;

    // GET: api/leaderboard/prs — the current user's logged records
    [HttpGet("prs")]
    public async Task<IActionResult> MyPrs()
    {
        var uid = User.CurrentUserId();
        if (uid == null) return Forbid();
        var rows = await _context.PersonalRecords
            .Where(p => p.UserId == uid)
            .OrderByDescending(p => p.Date)
            .Select(p => new { p.Id, p.Benchmark, p.Value, p.Date, p.Note })
            .ToListAsync();
        return Ok(rows);
    }

    // GET: api/leaderboard/board?benchmark=fran — best result per athlete across the gym
    [HttpGet("board")]
    public async Task<IActionResult> Board([FromQuery] string benchmark)
    {
        if (string.IsNullOrWhiteSpace(benchmark)) return BadRequest(new { message = "benchmark required" });
        var key = benchmark.Trim().ToLowerInvariant();
        var lowerWins = LowerIsBetterBenchmarks.Contains(key);

        var grouped = await _context.PersonalRecords
            .Where(p => p.Benchmark == key)
            .Include(p => p.User)
            .GroupBy(p => new { p.UserId, p.User.Name })
            .Select(g => new { athlete = g.Key.Name, best = g.Min(x => x.Value), bestHigh = g.Max(x => x.Value) })
            .ToListAsync();

        var rows = grouped
            .Select(r => new { r.athlete, value = lowerWins ? r.best : r.bestHigh })
            .OrderBy(r => lowerWins ? r.value : -r.value)
            .ThenBy(r => r.athlete)
            .ToList();
        return Ok(rows);
    }

    [HttpPost("prs")]
    public async Task<IActionResult> Create([FromBody] PrRequest request)
    {
        var uid = User.CurrentUserId();
        if (uid == null) return Forbid();
        if (string.IsNullOrWhiteSpace(request.Benchmark)) return BadRequest(new { message = "benchmark required" });
        if (request.Value <= 0) return BadRequest(new { message = "value must be greater than zero" });
        if (request.Date.HasValue && request.Date.Value.Date > DateTime.UtcNow.Date.AddDays(1))
            return BadRequest(new { message = "date cannot be in the future" });
        var key = request.Benchmark.Trim().ToLowerInvariant();
        var pr = new PersonalRecord
        {
            UserId = uid.Value,
            Benchmark = key,
            Value = request.Value,
            Date = request.Date ?? DateTime.UtcNow,
            Note = request.Note,
        };
        _context.PersonalRecords.Add(pr);
        await _context.SaveChangesAsync();
        return Ok(new { pr.Id });
    }

    [HttpDelete("prs/{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var uid = User.CurrentUserId();
        var pr = await _context.PersonalRecords.FindAsync(id);
        if (pr == null) return NotFound();
        if (pr.UserId != uid) return Forbid();
        _context.PersonalRecords.Remove(pr);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Deleted" });
    }
}

public class PrRequest
{
    [Required, MaxLength(40)] public string Benchmark { get; set; } = null!;
    public decimal Value { get; set; }
    public DateTime? Date { get; set; }
    [MaxLength(200)] public string? Note { get; set; }
}
