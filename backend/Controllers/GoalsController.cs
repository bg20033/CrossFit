using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GoalsController : ControllerBase
{
    private readonly FitnessContext _context;

    public GoalsController(FitnessContext context)
    {
        _context = context;
    }

    private bool IsStaffOrAbove() =>
        User.IsInRole("Admin") || User.IsInRole("GymOwner") || User.IsInRole("Trainer") || User.IsInRole("Staff");

    private async Task<bool> CanAccessClientAsync(int clientId)
    {
        if (IsStaffOrAbove()) return true;
        var uid = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(uid, out var userId)) return false;
        var own = await _context.Clients.Where(c => c.UserId == userId).Select(c => (int?)c.Id).FirstOrDefaultAsync();
        return own == clientId;
    }

    // GET: api/goals?clientId=5&status=in_progress
    [HttpGet]
    public async Task<IActionResult> GetGoals(
        [FromQuery] int? clientId,
        [FromQuery] string? status)
    {
        // A client may only list their own goals (and must scope by clientId).
        if (clientId.HasValue) { if (!await CanAccessClientAsync(clientId.Value)) return Forbid(); }
        else if (!IsStaffOrAbove()) return Forbid();

        var query = _context.Goals
            .Include(g => g.Client)
            .AsQueryable();

        if (clientId.HasValue)
            query = query.Where(g => g.ClientId == clientId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(g => g.Status == status);

        var goals = await query
            .OrderByDescending(g => g.TargetDate)
            .Select(g => new
            {
                g.Id,
                g.Title,
                g.Description,
                g.Type,
                g.TargetValue,
                g.Unit,
                Client = g.Client.User.Name,
                g.TargetDate,
                g.Status,
                g.CreatedAt
            })
            .ToListAsync();

        var result = goals.Select(g => new
        {
            g.Id,
            g.Title,
            g.Description,
            g.Type,
            g.TargetValue,
            g.Unit,
            g.Client,
            g.TargetDate,
            g.Status,
            DaysRemaining = (g.TargetDate - DateTime.UtcNow).Days,
            g.CreatedAt
        });

        return Ok(result);
    }

    // GET: api/goals/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetGoal(int id)
    {
        var goal = await _context.Goals
            .Include(g => g.Client).ThenInclude(c => c.User)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (goal == null)
            return NotFound();

        return Ok(new
        {
            goal.Id,
            goal.Title,
            goal.Description,
            goal.Type,
            goal.TargetValue,
            goal.Unit,
            Client = goal.Client.User.Name,
            goal.TargetDate,
            goal.Status,
            DaysRemaining = (goal.TargetDate - DateTime.UtcNow).Days,
            goal.CreatedAt,
            goal.UpdatedAt
        });
    }

    // POST: api/goals/create
    // Clients create their own goals; staff/trainers can create for any client.
    [HttpPost("create")]
    public async Task<IActionResult> CreateGoal([FromBody] CreateGoalRequest request)
    {
        if (!await CanAccessClientAsync(request.ClientId)) return Forbid();

        var client = await _context.Clients.FindAsync(request.ClientId);
        if (client == null)
            return BadRequest(new { message = "Client not found" });

        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Title is required" });
        if (request.TargetDate.Date < DateTime.UtcNow.Date)
            return BadRequest(new { message = "Target date must be in the future" });
        if (request.TargetValue.HasValue && (request.TargetValue.Value < 0 || request.TargetValue.Value > 100000))
            return BadRequest(new { message = "Target value is out of range" });

        var goal = new Goal
        {
            Title = request.Title.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            Type = string.IsNullOrWhiteSpace(request.Type) ? "other" : request.Type.Trim(),
            TargetValue = request.TargetValue,
            Unit = request.Unit?.Trim() ?? string.Empty,
            ClientId = request.ClientId,
            TargetDate = request.TargetDate,
            Status = "in_progress"
        };

        _context.Goals.Add(goal);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Goal created successfully", id = goal.Id });
    }

    // PUT: api/goals/{id}
    [Authorize(Policy = "AdminTrainer")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateGoal(int id, [FromBody] UpdateGoalRequest request)
    {
        var goal = await _context.Goals.FindAsync(id);
        if (goal == null)
            return NotFound();

        goal.Title = request.Title ?? goal.Title;
        goal.Description = request.Description ?? goal.Description;
        goal.Type = request.Type ?? goal.Type;
        goal.TargetValue = request.TargetValue ?? goal.TargetValue;
        goal.Unit = request.Unit ?? goal.Unit;
        goal.TargetDate = request.TargetDate ?? goal.TargetDate;
        goal.Status = request.Status ?? goal.Status;
        goal.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Goal updated successfully" });
    }

    // POST: api/goals/{id}/complete
    [HttpPost("{id}/complete")]
    public async Task<IActionResult> CompleteGoal(int id)
    {
        var goal = await _context.Goals.FindAsync(id);
        if (goal == null)
            return NotFound();
        if (!await CanAccessClientAsync(goal.ClientId)) return Forbid();

        goal.Status = "completed";
        goal.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Goal marked as completed" });
    }

    // POST: api/goals/{id}/abandon
    [HttpPost("{id}/abandon")]
    public async Task<IActionResult> AbandonGoal(int id)
    {
        var goal = await _context.Goals.FindAsync(id);
        if (goal == null)
            return NotFound();
        if (!await CanAccessClientAsync(goal.ClientId)) return Forbid();

        goal.Status = "abandoned";
        goal.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Goal abandoned" });
    }

    // DELETE: api/goals/{id}
    [Authorize(Policy = "AdminTrainer")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGoal(int id)
    {
        var goal = await _context.Goals.FindAsync(id);
        if (goal == null)
            return NotFound();

        _context.Goals.Remove(goal);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Goal deleted successfully" });
    }

    // GET: api/goals/stats?clientId=5
    [HttpGet("stats/{clientId}")]
    public async Task<IActionResult> GetGoalStats(int clientId)
    {
        if (!await CanAccessClientAsync(clientId)) return Forbid();
        var goals = await _context.Goals
            .Where(g => g.ClientId == clientId)
            .ToListAsync();

        var total = goals.Count;
        var completed = goals.Count(g => g.Status == "completed");
        var inProgress = goals.Count(g => g.Status == "in_progress");
        var abandoned = goals.Count(g => g.Status == "abandoned");
        var successRate = total > 0 ? ((decimal)completed / total * 100) : 0;

        return Ok(new
        {
            total,
            completed,
            inProgress,
            abandoned,
            successRatePercent = Math.Round(successRate, 2)
        });
    }
}

public class CreateGoalRequest
{
    public int ClientId { get; set; }
    public string Title { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
    public string Type { get; set; } = null!; // weight_loss, muscle_gain, strength, endurance, flexibility, benchmark, other
    public decimal? TargetValue { get; set; }
    public string? Unit { get; set; }
    public DateTime TargetDate { get; set; }
}

public class UpdateGoalRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Type { get; set; }
    public decimal? TargetValue { get; set; }
    public string? Unit { get; set; }
    public DateTime? TargetDate { get; set; }
    public string? Status { get; set; }
}
