using Microsoft.AspNetCore.Authorization;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GymSettingsController : ControllerBase
{
    private readonly FitnessContext _context;

    public GymSettingsController(FitnessContext context)
    {
        _context = context;
    }

    private async Task<GymSettings> GetOrCreateAsync()
    {
        var settings = await _context.GymSettings.OrderBy(s => s.Id).FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new GymSettings();
            _context.GymSettings.Add(settings);
            await _context.SaveChangesAsync();
        }
        return settings;
    }

    // GET: api/gymsettings  (any authenticated user can read branding/hours)
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var s = await GetOrCreateAsync();
        return Ok(new
        {
            s.OpenTime, s.CloseTime, s.ClosedDays, s.HolidayDates,
            s.BrandName, s.BrandColor, s.RefundThreshold, s.UpdatedAt
        });
    }

    // PUT: api/gymsettings  (admins only)
    [Authorize(Policy = "AdminOnly")]
    [HttpPut]
    public async Task<IActionResult> Update([FromBody] GymSettingsRequest request)
    {
        var s = await GetOrCreateAsync();
        s.OpenTime = request.OpenTime ?? s.OpenTime;
        s.CloseTime = request.CloseTime ?? s.CloseTime;
        s.ClosedDays = request.ClosedDays ?? s.ClosedDays;
        s.HolidayDates = request.HolidayDates ?? s.HolidayDates;
        s.BrandName = request.BrandName ?? s.BrandName;
        s.BrandColor = request.BrandColor ?? s.BrandColor;
        if (request.RefundThreshold.HasValue) s.RefundThreshold = request.RefundThreshold.Value;
        s.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Updated" });
    }
}

public class GymSettingsRequest
{
    [MaxLength(5)] public string? OpenTime { get; set; }
    [MaxLength(5)] public string? CloseTime { get; set; }
    [MaxLength(40)] public string? ClosedDays { get; set; }
    [MaxLength(2000)] public string? HolidayDates { get; set; }
    [MaxLength(120)] public string? BrandName { get; set; }
    [MaxLength(20)] public string? BrandColor { get; set; }
    [Range(0, 1_000_000)] public decimal? RefundThreshold { get; set; }
}
