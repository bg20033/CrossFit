using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

    public PublicController(FitnessContext context) => _context = context;

    [HttpGet("landing")]
    public async Task<IActionResult> Landing()
    {
        var trainers = await _context.Trainers
            .Where(t => t.User.IsActive && t.User.Role == UserRole.Trainer && t.IsAvailable)
            .OrderBy(t => t.CreatedAt)
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

        return Ok(new { trainers, plans });
    }
}
