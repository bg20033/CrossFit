using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using StandUpFitness.Data;
using StandUpFitness.Models;
using StandUpFitness.Services;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "ClientArea")]
public class NutritionController : ControllerBase
{
    private readonly FitnessContext _context;

    public NutritionController(FitnessContext context)
    {
        _context = context;
    }

    // GET /api/nutrition/me — the saved profile + targets (204 if none yet).
    [HttpGet("me")]
    public async Task<IActionResult> GetMine()
    {
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();

        var p = await _context.NutritionProfiles.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId);
        if (p == null) return NoContent();
        return Ok(Shape(p));
    }

    // GET /api/nutrition/log?date=2026-06-22 — food + water for one day.
    [HttpGet("log")]
    public async Task<IActionResult> Log([FromQuery] DateTime? date)
    {
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();

        var day = (date ?? DateTime.UtcNow).Date;
        var foods = await _context.FoodLogEntries
            .AsNoTracking()
            .Where(f => f.UserId == userId && f.Date == day)
            .OrderBy(f => f.CreatedAt)
            .Select(f => new
            {
                f.Id,
                f.Name,
                f.Kcal,
                Protein = f.Protein,
                Carbs = f.Carbs,
                Fat = f.Fat,
                f.Meal
            })
            .ToListAsync();

        var waterMl = await _context.WaterLogs
            .Where(w => w.UserId == userId && w.Date == day)
            .Select(w => (int?)w.WaterMl)
            .FirstOrDefaultAsync() ?? 0;

        return Ok(new { date = day, foods, waterMl });
    }

    // POST /api/nutrition/log/foods — add a food entry to the day log.
    [HttpPost("log/foods")]
    public async Task<IActionResult> AddFood([FromBody] FoodLogRequest request)
    {
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "Name required" });
        if (request.Date.HasValue && request.Date.Value.Date > DateTime.UtcNow.Date.AddDays(1))
            return BadRequest(new { message = "Date cannot be in the future" });

        var food = new FoodLogEntry
        {
            UserId = userId.Value,
            Date = (request.Date ?? DateTime.UtcNow).Date,
            Name = request.Name.Trim(),
            Kcal = Math.Max(0, request.Kcal),
            Protein = Math.Max(0, request.Protein),
            Carbs = Math.Max(0, request.Carbs),
            Fat = Math.Max(0, request.Fat),
            Meal = NormalizeMeal(request.Meal)
        };
        _context.FoodLogEntries.Add(food);
        await _context.SaveChangesAsync();

        return Ok(new { food.Id });
    }

    [HttpDelete("log/foods/{id}")]
    public async Task<IActionResult> DeleteFood(int id)
    {
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();

        var food = await _context.FoodLogEntries.FindAsync(id);
        if (food == null) return NotFound();
        if (food.UserId != userId) return Forbid();

        _context.FoodLogEntries.Remove(food);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Deleted" });
    }

    // PUT /api/nutrition/log/water — set the absolute water total for a day.
    [HttpPut("log/water")]
    public async Task<IActionResult> SetWater([FromBody] WaterLogRequest request)
    {
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();
        if (request.Date.HasValue && request.Date.Value.Date > DateTime.UtcNow.Date.AddDays(1))
            return BadRequest(new { message = "Date cannot be in the future" });

        var day = (request.Date ?? DateTime.UtcNow).Date;
        var water = await _context.WaterLogs.FirstOrDefaultAsync(w => w.UserId == userId && w.Date == day);
        if (water == null)
        {
            water = new WaterLog { UserId = userId.Value, Date = day };
            _context.WaterLogs.Add(water);
        }
        water.WaterMl = Math.Clamp(request.WaterMl, 0, 20000);
        water.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { water.WaterMl });
    }

    // PUT /api/nutrition/me — upsert answers; targets are computed server-side.
    [HttpPut("me")]
    public async Task<IActionResult> Save([FromBody] NutritionRequest req)
    {
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();

        var r = TdeeCalculator.Calc(req.Gender, req.WeightKg, req.HeightCm, req.Age, req.Activity, req.Goal);

        var p = await _context.NutritionProfiles.FirstOrDefaultAsync(x => x.UserId == userId);
        if (p == null)
        {
            p = new NutritionProfile { UserId = userId.Value };
            _context.NutritionProfiles.Add(p);
        }

        p.Gender = req.Gender;
        p.WeightKg = req.WeightKg;
        p.HeightCm = req.HeightCm;
        p.Age = req.Age;
        p.Activity = req.Activity;
        p.Goal = req.Goal;
        p.Bmr = r.Bmr;
        p.Tdee = r.Tdee;
        p.TargetCalories = r.Target;
        p.ProteinG = r.Protein;
        p.CarbsG = r.Carbs;
        p.FatG = r.Fat;
        p.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(Shape(p));
    }

    private static object Shape(NutritionProfile p) => new
    {
        gender = p.Gender,
        weightKg = p.WeightKg,
        heightCm = p.HeightCm,
        age = p.Age,
        activity = p.Activity,
        goal = p.Goal,
        bmr = p.Bmr,
        tdee = p.Tdee,
        target = p.TargetCalories,
        protein = p.ProteinG,
        carbs = p.CarbsG,
        fat = p.FatG,
        updatedAt = p.UpdatedAt,
    };

    private static string NormalizeMeal(string? meal)
    {
        var m = (meal ?? "breakfast").Trim().ToLowerInvariant();
        return new[] { "breakfast", "lunch", "dinner", "snack" }.Contains(m) ? m : "breakfast";
    }
}

public class NutritionRequest
{
    [Required, RegularExpression("^[MF]$")]
    public string Gender { get; set; } = "M";
    [Range(20, 400)] public double WeightKg { get; set; }
    [Range(100, 250)] public double HeightCm { get; set; }
    [Range(10, 100)] public int Age { get; set; }
    [Required] public string Activity { get; set; } = "moderate";
    [Required] public string Goal { get; set; } = "maintain";
}

public class FoodLogRequest
{
    public DateTime? Date { get; set; }
    [Required, MaxLength(120)] public string Name { get; set; } = null!;
    [Range(0, 10000)] public int Kcal { get; set; }
    [Range(0, 1000)] public decimal Protein { get; set; }
    [Range(0, 1000)] public decimal Carbs { get; set; }
    [Range(0, 1000)] public decimal Fat { get; set; }
    [MaxLength(20)] public string Meal { get; set; } = "breakfast";
}

public class WaterLogRequest
{
    public DateTime? Date { get; set; }
    [Range(0, 20000)] public int WaterMl { get; set; }
}
