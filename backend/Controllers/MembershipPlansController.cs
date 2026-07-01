using Microsoft.AspNetCore.Authorization;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminStaff")]
public class MembershipPlansController : ControllerBase
{
    private readonly FitnessContext _context;

    public MembershipPlansController(FitnessContext context)
    {
        _context = context;
    }

    // GET: api/membershipplans
    [HttpGet]
    public async Task<IActionResult> GetPlans([FromQuery] bool? activeOnly)
    {
        var query = _context.MembershipPlans.AsQueryable();
        if (activeOnly == true)
            query = query.Where(p => p.IsActive);

        var plans = await query
            .OrderBy(p => p.Price)
            .Select(p => new { p.Id, p.Name, p.DurationDays, p.Price, p.Description, p.IsActive, p.PlanType, p.GraceDays, p.MaxSharedMembers, p.SessionsTotal })
            .ToListAsync();

        return Ok(plans);
    }

    // POST: api/membershipplans
    [Authorize(Policy = "AdminOnly")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] MembershipPlanRequest request)
    {
        var plan = new MembershipPlan
        {
            Name = request.Name,
            DurationDays = request.DurationDays,
            Price = request.Price,
            Description = request.Description ?? "",
            PlanType = request.PlanType ?? "standard",
            GraceDays = request.GraceDays,
            MaxSharedMembers = request.MaxSharedMembers < 1 ? 1 : request.MaxSharedMembers,
            SessionsTotal = request.SessionsTotal,
            IsActive = true
        };
        _context.MembershipPlans.Add(plan);
        await _context.SaveChangesAsync();
        return Ok(new { plan.Id });
    }

    // PUT: api/membershipplans/{id}
    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] MembershipPlanRequest request)
    {
        var plan = await _context.MembershipPlans.FindAsync(id);
        if (plan == null) return NotFound();

        plan.Name = request.Name;
        plan.DurationDays = request.DurationDays;
        plan.Price = request.Price;
        plan.Description = request.Description ?? "";
        plan.PlanType = request.PlanType ?? plan.PlanType;
        plan.GraceDays = request.GraceDays;
        plan.MaxSharedMembers = request.MaxSharedMembers < 1 ? 1 : request.MaxSharedMembers;
        plan.SessionsTotal = request.SessionsTotal;
        if (request.IsActive.HasValue) plan.IsActive = request.IsActive.Value;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Updated" });
    }

    // DELETE: api/membershipplans/{id}
    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var plan = await _context.MembershipPlans.FindAsync(id);
        if (plan == null) return NotFound();
        plan.IsDeleted = true;
        plan.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Deleted" });
    }
}

public class MembershipPlanRequest
{
    [Required, MaxLength(80)] public string Name { get; set; } = null!;
    [Range(1, 3650)] public int DurationDays { get; set; }
    [Range(0, 1_000_000)] public decimal Price { get; set; }
    [MaxLength(500)] public string? Description { get; set; }
    [MaxLength(40)] public string? PlanType { get; set; }
    [Range(0, 365)] public int GraceDays { get; set; }
    [Range(1, 20)] public int MaxSharedMembers { get; set; } = 1;
    [Range(0, 1000)] public int SessionsTotal { get; set; }
    public bool? IsActive { get; set; }
}
