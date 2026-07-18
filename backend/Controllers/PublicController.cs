using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

/// <summary>
/// Të dhëna publike për faqen e marketingut (landing) — pa autentikim.
/// Ekspozon VETËM fusha jo-sensitive: emra trajnerësh, specializim, titull,
/// foto, bio, përvojë pune, çertifikata, trajnime, dhe pakot aktive me
/// çmim/kohëzgjatje. Kurrë email, tarifa orare a komisione.
/// </summary>
[ApiController]
[Route("api/public")]
[AllowAnonymous]
public class PublicController : ControllerBase
{
    private readonly FitnessContext _context;
    private readonly IMemoryCache _cache;

    // Publike dhe e njëjtë për të gjithë — 60s cache i mjafton trafikut të landing-ut
    // pa e vonuar dukshëm shfaqjen e trajnerëve/pakove të reja.
    private const string LandingCacheKey = "public-landing";
    private static readonly TimeSpan LandingCacheTtl = TimeSpan.FromSeconds(60);

    public PublicController(FitnessContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    [HttpGet("landing")]
    public async Task<IActionResult> Landing()
    {
        var payload = await _cache.GetOrCreateAsync(LandingCacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = LandingCacheTtl;
            return await BuildLandingPayloadAsync();
        });
        return Ok(payload);
    }

    private async Task<object> BuildLandingPayloadAsync()
    {
        var trainers = await _context.Trainers
            .Where(t => t.User.IsActive && t.User.Role == UserRole.Trainer && t.IsAvailable)
            .OrderBy(t => t.User.Name == "Onufer Veselaj" ? 0 : 1)
            .ThenBy(t => t.CreatedAt)
            .Select(t => new
            {
                t.Id,
                t.User.Name,
                t.Specialization,
                t.TrainerType,
                t.PhotoUrl,
                t.Title,
                t.Bio,
                t.WorkExperience,
                t.Certifications,
                t.Trainings
            })
            .ToListAsync();

        var plans = await _context.MembershipPlans
            .Where(p => p.IsActive)
            .OrderBy(p => p.Price)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Description,
                p.Price,
                p.DurationDays,
                p.SessionsTotal,
                p.PlanType
            })
            .ToListAsync();

        return new { trainers, plans };
    }
}
