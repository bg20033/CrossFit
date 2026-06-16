using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProgressController : ControllerBase
{
    private readonly FitnessContext _context;

    public ProgressController(FitnessContext context)
    {
        _context = context;
    }

    // Staff/Trainer/Admin can access any client; a Client may only access their own data.
    private async Task<bool> CanAccessClientAsync(int clientId)
    {
        if (User.IsInRole("Admin") || User.IsInRole("GymOwner") || User.IsInRole("Trainer") || User.IsInRole("Staff"))
            return true;
        var uid = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(uid, out var userId)) return false;
        var own = await _context.Clients.Where(c => c.UserId == userId).Select(c => (int?)c.Id).FirstOrDefaultAsync();
        return own == clientId;
    }

    // GET: api/progress?clientId=1
    [HttpGet]
    public async Task<IActionResult> GetLogs([FromQuery] int clientId)
    {
        if (!await CanAccessClientAsync(clientId)) return Forbid();
        var logs = await _context.ProgressLogs
            .Where(p => p.ClientId == clientId)
            .OrderByDescending(p => p.Date)
            .Select(p => new
            {
                p.Id,
                p.Date,
                p.Weight,
                p.Chest,
                p.Waist,
                p.Hips,
                p.Notes
            })
            .ToListAsync();

        return Ok(logs);
    }

    // POST: api/progress
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ProgressRequest request)
    {
        if (!await CanAccessClientAsync(request.ClientId)) return Forbid();
        var log = new ProgressLog
        {
            ClientId = request.ClientId,
            Date = request.Date ?? DateTime.UtcNow,
            Weight = request.Weight,
            Chest = request.Chest,
            Waist = request.Waist,
            Hips = request.Hips,
            Notes = request.Notes ?? ""
        };
        _context.ProgressLogs.Add(log);
        await _context.SaveChangesAsync();
        return Ok(new { log.Id });
    }

    // DELETE: api/progress/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var log = await _context.ProgressLogs.FindAsync(id);
        if (log == null) return NotFound();
        if (!await CanAccessClientAsync(log.ClientId)) return Forbid();
        _context.ProgressLogs.Remove(log);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Deleted" });
    }
}

public class ProgressRequest
{
    public int ClientId { get; set; }
    public DateTime? Date { get; set; }
    public decimal Weight { get; set; }
    public decimal? Chest { get; set; }
    public decimal? Waist { get; set; }
    public decimal? Hips { get; set; }
    public string? Notes { get; set; }
}
