using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;
using StandUpFitness.Services;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WorkoutPlansController : ControllerBase
{
    private readonly FitnessContext _context;

    public WorkoutPlansController(FitnessContext context)
    {
        _context = context;
    }

    // GET: api/workoutplans?trainerId=1&clientId=5
    [HttpGet]
    public async Task<IActionResult> GetWorkoutPlans(
        [FromQuery] int? trainerId,
        [FromQuery] int? clientId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        // A client may only ever list their own plans, never another client's.
        if (User.CanManageCoreScope(includeStaff: true, permission: "workouts.write"))
        {
            // Admin/staff/custom workout managers may use the requested filters.
        }
        else if (User.IsInRole("Trainer"))
        {
            var ownTrainerId = await _context.CurrentCoreTrainerIdAsync(User);
            if (ownTrainerId == null) return Forbid();
            if (trainerId.HasValue && trainerId.Value != ownTrainerId.Value) return Forbid();
            if (clientId.HasValue && !await _context.TrainerCanAccessClientAsync(User, clientId.Value)) return Forbid();
            trainerId = ownTrainerId;
        }
        else
        {
            var own = await _context.OwnClientIdAsync(User);
            if (own == null) return Forbid();
            clientId = own;
            trainerId = null;
        }

        var query = _context.WorkoutPlans
            .Include(wp => wp.Trainer)
            .Include(wp => wp.Client)
            .AsQueryable();

        if (trainerId.HasValue)
            query = query.Where(wp => wp.TrainerId == trainerId);

        if (clientId.HasValue)
            query = query.Where(wp => wp.ClientId == clientId);

        var total = await query.CountAsync();
        var plans = await query
            .OrderByDescending(wp => wp.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(wp => new
            {
                wp.Id,
                wp.Name,
                Trainer = wp.Trainer.User.Name,
                Client = wp.Client.User.Name,
                wp.StartDate,
                wp.EndDate,
                wp.DurationWeeks,
                wp.IsActive,
                wp.CreatedAt
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, plans });
    }

    // GET: api/workoutplans/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetWorkoutPlan(int id)
    {
        var plan = await _context.WorkoutPlans
            .Include(wp => wp.Trainer).ThenInclude(t => t.User)
            .Include(wp => wp.Client).ThenInclude(c => c.User)
            .FirstOrDefaultAsync(wp => wp.Id == id);

        if (plan == null)
            return NotFound();
        if (!await _context.CanAccessCoreClientAsync(User, plan.ClientId, managerPermission: "workouts.write")) return Forbid();

        return Ok(new
        {
            plan.Id,
            plan.Name,
            plan.Description,
            Trainer = plan.Trainer.User.Name,
            Client = plan.Client.User.Name,
            plan.Content,
            plan.StartDate,
            plan.EndDate,
            plan.DurationWeeks,
            plan.IsActive,
            plan.CreatedAt
        });
    }

    // POST: api/workoutplans/create
    [Authorize(Policy = "AdminTrainer")]
    [HttpPost("create")]
    public async Task<IActionResult> CreateWorkoutPlan([FromBody] CreateWorkoutPlanRequest request)
    {
        var trainer = await _context.Trainers.FindAsync(request.TrainerId);
        if (trainer == null)
            return BadRequest("Trainer not found");

        var client = await _context.Clients.FindAsync(request.ClientId);
        if (client == null)
            return BadRequest("Client not found");
        if (!User.CanManageCoreScope(permission: "workouts.write"))
        {
            var ownTrainerId = await _context.CurrentCoreTrainerIdAsync(User);
            if (ownTrainerId == null || request.TrainerId != ownTrainerId.Value || !await _context.TrainerCanAccessClientAsync(User, request.ClientId))
                return Forbid();
        }

        var plan = new WorkoutPlan
        {
            Name = request.Name,
            Description = request.Description,
            TrainerId = request.TrainerId,
            ClientId = request.ClientId,
            Content = request.Content ?? "{}",
            StartDate = request.StartDate ?? DateTime.UtcNow,
            EndDate = request.EndDate,
            DurationWeeks = request.DurationWeeks,
            IsActive = true
        };

        _context.WorkoutPlans.Add(plan);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Workout plan created successfully", id = plan.Id });
    }

    // PUT: api/workoutplans/{id}
    [Authorize(Policy = "AdminTrainer")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateWorkoutPlan(int id, [FromBody] UpdateWorkoutPlanRequest request)
    {
        var plan = await _context.WorkoutPlans.FindAsync(id);
        if (plan == null)
            return NotFound();
        if (!await _context.CanAccessCoreTrainerAsync(User, plan.TrainerId, "workouts.write")) return Forbid();

        plan.Name = request.Name ?? plan.Name;
        plan.Description = request.Description ?? plan.Description;
        plan.Content = request.Content ?? plan.Content;
        plan.EndDate = request.EndDate ?? plan.EndDate;
        plan.DurationWeeks = request.DurationWeeks ?? plan.DurationWeeks;
        plan.IsActive = request.IsActive ?? plan.IsActive;
        plan.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Workout plan updated successfully" });
    }

    // POST: api/workoutplans/{id}/publish
    [Authorize(Policy = "AdminTrainer")]
    [HttpPost("{id}/publish")]
    public async Task<IActionResult> PublishPlan(int id)
    {
        var plan = await _context.WorkoutPlans.FindAsync(id);
        if (plan == null)
            return NotFound();
        if (!await _context.CanAccessCoreTrainerAsync(User, plan.TrainerId, "workouts.write")) return Forbid();

        plan.IsActive = true;
        plan.StartDate = DateTime.UtcNow;
        plan.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Workout plan published successfully" });
    }

    // DELETE: api/workoutplans/{id}
    [Authorize(Policy = "AdminTrainer")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteWorkoutPlan(int id)
    {
        var plan = await _context.WorkoutPlans.FindAsync(id);
        if (plan == null)
            return NotFound();
        if (!await _context.CanAccessCoreTrainerAsync(User, plan.TrainerId, "workouts.write")) return Forbid();

        _context.WorkoutPlans.Remove(plan);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Workout plan deleted successfully" });
    }

    // POST: api/workoutplans/{id}/export-pdf
    [HttpPost("{id}/export-pdf")]
    public async Task<IActionResult> ExportToPdf(int id)
    {
        var plan = await _context.WorkoutPlans
            .Include(wp => wp.Client).ThenInclude(c => c.User)
            .FirstOrDefaultAsync(wp => wp.Id == id);

        if (plan == null)
            return NotFound();
        if (!await _context.CanAccessCoreClientAsync(User, plan.ClientId, managerPermission: "workouts.write")) return Forbid();

        // For now, return JSON with plan data
        // PDF generation happens on frontend with jsPDF
        return Ok(new
        {
            message = "PDF data ready for export",
            plan = new
            {
                plan.Id,
                plan.Name,
                plan.Description,
                Client = plan.Client.User.Name,
                plan.Content,
                plan.StartDate,
                plan.DurationWeeks,
                GeneratedAt = DateTime.UtcNow
            }
        });
    }
}

public class CreateWorkoutPlanRequest
{
    public int TrainerId { get; set; }
    public int ClientId { get; set; }
    public string Name { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
    public string? Content { get; set; } // JSON format
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int DurationWeeks { get; set; } = 4;
}

public class UpdateWorkoutPlanRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Content { get; set; }
    public DateTime? EndDate { get; set; }
    public int? DurationWeeks { get; set; }
    public bool? IsActive { get; set; }
}
