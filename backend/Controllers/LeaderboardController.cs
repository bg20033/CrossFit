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
            .Select(p => new { p.Id, p.Benchmark, p.Value, p.Reps, p.Date, p.Note, p.CreatedAt })
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

        // Rezultatet e reja janë peshë × reps: fituesi = pesha më e madhe, barazim →
        // më shumë reps. (Çelësat legacy të WOD-eve me kohë mbeten lower-wins.)
        var all = await _context.PersonalRecords
            .Where(p => p.Benchmark == key)
            .Select(p => new { p.UserId, Athlete = p.User.Name, p.Value, p.Reps })
            .ToListAsync();

        var rows = all
            .GroupBy(p => new { p.UserId, p.Athlete })
            .Select(g => lowerWins
                ? g.OrderBy(x => x.Value).First()
                : g.OrderByDescending(x => x.Value).ThenByDescending(x => x.Reps).First())
            .Select(r => new { athlete = r.Athlete, value = r.Value, reps = r.Reps })
            .OrderBy(r => lowerWins ? r.value : -r.value)
            .ThenByDescending(r => r.reps)
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
        // Pesha 0 lejohet (ushtrime me peshë trupore — pull-ups, dips, push-ups…),
        // por atëherë duhen reps; negativet jo.
        if (request.Value < 0) return BadRequest(new { message = "Pesha s'mund të jetë negative." });
        var reps = request.Reps ?? 1;
        if (reps < 1 || reps > 1000) return BadRequest(new { message = "Përsëritjet duhet të jenë 1–1000." });
        if (request.Value == 0 && reps < 1) return BadRequest(new { message = "Vendos peshën ose përsëritjet." });
        if (request.Date.HasValue && request.Date.Value.Date > DateTime.UtcNow.Date.AddDays(1))
            return BadRequest(new { message = "date cannot be in the future" });
        var key = request.Benchmark.Trim().ToLowerInvariant();
        var pr = new PersonalRecord
        {
            UserId = uid.Value,
            Benchmark = key,
            Value = request.Value,
            Reps = reps,
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
    public decimal Value { get; set; } // pesha në kg (0 = trup i lirë)
    [Range(1, 1000)] public int? Reps { get; set; }
    public DateTime? Date { get; set; }
    [MaxLength(200)] public string? Note { get; set; }
}
