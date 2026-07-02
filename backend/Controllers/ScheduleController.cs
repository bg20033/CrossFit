using Microsoft.AspNetCore.Authorization;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/schedule")]
[Authorize]
public class ScheduleController : ControllerBase
{
    private readonly FitnessContext _context;
    public ScheduleController(FitnessContext context) => _context = context;

    // GET: api/schedule — full weekly grid (any authenticated user)
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var rows = await _context.ClassSessions
            .OrderBy(s => s.Day).ThenBy(s => s.StartMin)
            .Select(s => new { s.Id, s.Title, s.Trainer, s.Day, s.StartMin, s.DurationMin, s.Room, s.Capacity })
            .ToListAsync();
        return Ok(rows);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SessionRequest request)
    {
        var validation = ValidateSession(request);
        if (validation != null) return validation;

        var s = new ClassSession
        {
            Title = request.Title.Trim(),
            Trainer = request.Trainer?.Trim() ?? "",
            Day = request.Day,
            StartMin = request.StartMin,
            DurationMin = request.DurationMin,
            Room = request.Room?.Trim() ?? "",
            Capacity = request.Capacity,
        };
        _context.ClassSessions.Add(s);
        await _context.SaveChangesAsync();
        return Ok(new { s.Id });
    }

    // PUT: api/schedule/{id} — reschedule (drag-drop) or edit
    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] SessionRequest request)
    {
        var validation = ValidateSession(request);
        if (validation != null) return validation;

        var s = await _context.ClassSessions.FindAsync(id);
        if (s == null) return NotFound();
        s.Title = request.Title.Trim();
        s.Trainer = request.Trainer?.Trim() ?? "";
        s.Day = request.Day;
        s.StartMin = request.StartMin;
        s.DurationMin = request.DurationMin;
        s.Room = request.Room?.Trim() ?? "";
        s.Capacity = request.Capacity;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Updated" });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var s = await _context.ClassSessions.FindAsync(id);
        if (s == null) return NotFound();
        _context.ClassSessions.Remove(s);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Deleted" });
    }

    private BadRequestObjectResult? ValidateSession(SessionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title)) return BadRequest(new { message = "Title is required" });
        if (request.Day < 0 || request.Day > 6) return BadRequest(new { message = "Day must be between 0 and 6" });
        if (request.StartMin < 0 || request.StartMin > 1439) return BadRequest(new { message = "Start time is invalid" });
        if (request.DurationMin < 1 || request.DurationMin > 240) return BadRequest(new { message = "Duration must be between 1 and 240 minutes" });
        if (request.Capacity < 1 || request.Capacity > 200) return BadRequest(new { message = "Capacity must be between 1 and 200" });
        return null;
    }
}

public class SessionRequest
{
    [MaxLength(120)] public string Title { get; set; } = null!;
    [MaxLength(120)] public string? Trainer { get; set; }
    public int Day { get; set; }
    public int StartMin { get; set; }
    public int DurationMin { get; set; } = 60;
    [MaxLength(80)] public string? Room { get; set; }
    public int Capacity { get; set; } = 12;
}
