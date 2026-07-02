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
public class DietPlansController : ControllerBase
{
    private readonly FitnessContext _context;

    public DietPlansController(FitnessContext context)
    {
        _context = context;
    }

    // GET: api/dietplans?clientId=5&trainerId=1
    [HttpGet]
    public async Task<IActionResult> GetDietPlans(
        [FromQuery] int? trainerId,
        [FromQuery] int? clientId)
    {
        // A client may only ever list their own plans, never another client's.
        if (User.CanManageCoreScope(includeStaff: true, permission: "nutrition.write"))
        {
            // Admin/staff/custom nutrition managers may use the requested filters.
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

        var query = _context.DietPlans
            .Include(dp => dp.Trainer)
            .Include(dp => dp.Client)
            .AsQueryable();

        if (trainerId.HasValue)
            query = query.Where(dp => dp.TrainerId == trainerId);

        if (clientId.HasValue)
            query = query.Where(dp => dp.ClientId == clientId);

        var plans = await query
            .OrderByDescending(dp => dp.CreatedAt)
            .Select(dp => new
            {
                dp.Id,
                dp.Name,
                Trainer = dp.Trainer.User.Name,
                Client = dp.Client.User.Name,
                dp.StartDate,
                dp.EndDate,
                dp.IsActive,
                dp.CreatedAt
            })
            .ToListAsync();

        return Ok(plans);
    }

    // GET: api/dietplans/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetDietPlan(int id)
    {
        var plan = await _context.DietPlans
            .Include(dp => dp.Trainer).ThenInclude(t => t.User)
            .Include(dp => dp.Client).ThenInclude(c => c.User)
            .FirstOrDefaultAsync(dp => dp.Id == id);

        if (plan == null)
            return NotFound();
        if (!await _context.CanAccessCoreClientAsync(User, plan.ClientId, managerPermission: "nutrition.write")) return Forbid();

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
            plan.IsActive,
            plan.CreatedAt
        });
    }

    // POST: api/dietplans/create
    [Authorize(Policy = "AdminTrainer")]
    [HttpPost("create")]
    public async Task<IActionResult> CreateDietPlan([FromBody] CreateDietPlanRequest request)
    {
        var trainer = await _context.Trainers.FindAsync(request.TrainerId);
        if (trainer == null)
            return BadRequest("Trainer not found");

        var client = await _context.Clients.FindAsync(request.ClientId);
        if (client == null)
            return BadRequest("Client not found");
        if (!User.CanManageCoreScope(permission: "nutrition.write"))
        {
            var ownTrainerId = await _context.CurrentCoreTrainerIdAsync(User);
            if (ownTrainerId == null || request.TrainerId != ownTrainerId.Value || !await _context.TrainerCanAccessClientAsync(User, request.ClientId))
                return Forbid();
        }

        var plan = new DietPlan
        {
            Name = request.Name,
            Description = request.Description,
            TrainerId = request.TrainerId,
            ClientId = request.ClientId,
            Content = request.Content ?? "{}",
            StartDate = request.StartDate ?? DateTime.UtcNow,
            EndDate = request.EndDate,
            IsActive = true
        };

        _context.DietPlans.Add(plan);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Diet plan created successfully", id = plan.Id });
    }

    // PUT: api/dietplans/{id}
    [Authorize(Policy = "AdminTrainer")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDietPlan(int id, [FromBody] UpdateDietPlanRequest request)
    {
        var plan = await _context.DietPlans.FindAsync(id);
        if (plan == null)
            return NotFound();
        if (!await _context.CanAccessCoreTrainerAsync(User, plan.TrainerId, "nutrition.write")) return Forbid();

        plan.Name = request.Name ?? plan.Name;
        plan.Description = request.Description ?? plan.Description;
        plan.Content = request.Content ?? plan.Content;
        plan.EndDate = request.EndDate ?? plan.EndDate;
        plan.IsActive = request.IsActive ?? plan.IsActive;
        plan.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Diet plan updated successfully" });
    }

    // DELETE: api/dietplans/{id}
    [Authorize(Policy = "AdminTrainer")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDietPlan(int id)
    {
        var plan = await _context.DietPlans.FindAsync(id);
        if (plan == null)
            return NotFound();
        if (!await _context.CanAccessCoreTrainerAsync(User, plan.TrainerId, "nutrition.write")) return Forbid();

        _context.DietPlans.Remove(plan);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Diet plan deleted successfully" });
    }

    // POST: api/dietplans/{id}/activate
    [Authorize(Policy = "AdminTrainer")]
    [HttpPost("{id}/activate")]
    public async Task<IActionResult> ActivateDietPlan(int id)
    {
        var plan = await _context.DietPlans.FindAsync(id);
        if (plan == null)
            return NotFound();
        if (!await _context.CanAccessCoreTrainerAsync(User, plan.TrainerId, "nutrition.write")) return Forbid();

        // Deactivate other active plans for this client
        var otherPlans = await _context.DietPlans
            .Where(p => p.ClientId == plan.ClientId && p.Id != id && p.IsActive)
            .ToListAsync();

        foreach (var p in otherPlans)
            p.IsActive = false;

        plan.IsActive = true;
        plan.StartDate = DateTime.UtcNow;
        plan.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Diet plan activated successfully" });
    }
}

public class CreateDietPlanRequest
{
    public int TrainerId { get; set; }
    public int ClientId { get; set; }
    public string Name { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
    public string? Content { get; set; } // JSON with meals, calories, macros
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public class UpdateDietPlanRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Content { get; set; }
    public DateTime? EndDate { get; set; }
    public bool? IsActive { get; set; }
}
