using Microsoft.AspNetCore.Authorization;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminTrainer")]
public class TrainersController : ControllerBase
{
    private readonly FitnessContext _context;

    public TrainersController(FitnessContext context)
    {
        _context = context;
    }

    // GET: api/trainers/me -> trainer profile for the logged-in user (auto-created on first access)
    [HttpGet("me")]
    public async Task<IActionResult> GetMyTrainerProfile()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim?.Value, out var userId))
            return Unauthorized();

        var trainer = await _context.Trainers
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.UserId == userId);

        if (trainer == null)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();
            trainer = new Trainer { UserId = userId };
            _context.Trainers.Add(trainer);
            await _context.SaveChangesAsync();
            await _context.Entry(trainer).Reference(t => t.User).LoadAsync();
        }

        return Ok(new
        {
            trainer.Id,
            trainer.User.Name,
            trainer.User.Email,
            trainer.Specialization,
            trainer.HourlyRate,
            trainer.IsAvailable
        });
    }

    // GET: api/trainers
    [HttpGet]
    public async Task<IActionResult> GetTrainers([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var total = await _context.Trainers.CountAsync();
        var trainers = await _context.Trainers
            .Include(t => t.User)
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new
            {
                t.Id,
                t.User.Name,
                t.User.Email,
                t.Specialization,
                t.HourlyRate,
                t.IsAvailable,
                ClientsCount = t.PersonalSessions.Count(),
                t.CreatedAt
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, trainers });
    }

    // GET: api/trainers/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetTrainer(int id)
    {
        var trainer = await _context.Trainers
            .Include(t => t.User)
            .Include(t => t.Groups)
            .Include(t => t.PersonalSessions)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (trainer == null)
            return NotFound();

        return Ok(new
        {
            trainer.Id,
            trainer.User.Name,
            trainer.User.Email,
            trainer.Specialization,
            trainer.Bio,
            trainer.HourlyRate,
            trainer.IsAvailable,
            Groups = trainer.Groups.Select(g => new { g.Id, g.Name }),
            ClientsCount = trainer.PersonalSessions.Select(ps => ps.ClientId).Distinct().Count(),
            trainer.CreatedAt
        });
    }

    // POST: api/trainers/create
    [Authorize(Policy = "AdminOnly")]
    [HttpPost("create")]
    public async Task<IActionResult> CreateTrainer([FromBody] CreateTrainerRequest request)
    {
        var userExists = await _context.Users.AnyAsync(u => u.Email == request.Email);
        if (userExists)
            return BadRequest("Email already exists");

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var user = new User
        {
            Email = request.Email,
            Name = request.Name,
            PasswordHash = passwordHash,
            Role = UserRole.Trainer
        };

        var trainer = new Trainer
        {
            User = user,
            Specialization = request.Specialization,
            Bio = request.Bio,
            HourlyRate = request.HourlyRate,
            IsAvailable = true
        };

        _context.Users.Add(user);
        _context.Trainers.Add(trainer);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Trainer created successfully", id = trainer.Id });
    }

    // PUT: api/trainers/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTrainer(int id, [FromBody] UpdateTrainerRequest request)
    {
        var trainer = await _context.Trainers
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (trainer == null)
            return NotFound();

        if (request.Name != null)
            trainer.User.Name = request.Name;

        trainer.Specialization = request.Specialization ?? trainer.Specialization;
        trainer.Bio = request.Bio ?? trainer.Bio;
        trainer.HourlyRate = request.HourlyRate ?? trainer.HourlyRate;
        trainer.IsAvailable = request.IsAvailable ?? trainer.IsAvailable;
        trainer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Trainer updated successfully" });
    }

    // GET: api/trainers/{id}/clients
    [HttpGet("{id}/clients")]
    public async Task<IActionResult> GetTrainerClients(int id)
    {
        var trainer = await _context.Trainers.FindAsync(id);
        if (trainer == null)
            return NotFound();

        var clients = await _context.Clients
            .Where(c => c.TrainerId == id)
            .Include(c => c.User)
            .Select(c => new
            {
                c.Id,
                c.User.Name,
                c.User.Email,
                c.MembershipType,
                c.IsActive,
                c.MembershipExpiry
            })
            .ToListAsync();

        return Ok(clients);
    }

    // GET: api/trainers/{id}/schedule
    [HttpGet("{id}/schedule")]
    public async Task<IActionResult> GetTrainerSchedule(int id)
    {
        var trainer = await _context.Trainers.FindAsync(id);
        if (trainer == null)
            return NotFound();

        var groups = await _context.TrainingGroups
            .Where(g => g.TrainerId == id)
            .Select(g => new
            {
                g.Id,
                g.Name,
                g.DayOfWeek,
                g.ScheduleStart,
                g.ScheduleEnd,
                g.MaxCapacity,
                MembersCount = g.Clients.Count()
            })
            .ToListAsync();

        var sessions = await _context.PersonalSessions
            .Where(ps => ps.TrainerId == id)
            .Include(ps => ps.Client)
            .Where(ps => ps.Status != "cancelled")
            .OrderBy(ps => ps.ScheduledDate)
            .Select(ps => new
            {
                ps.Id,
                Client = ps.Client.User.Name,
                ps.ScheduledDate,
                ps.Duration,
                ps.Status
            })
            .ToListAsync();

        return Ok(new { groups, sessions });
    }
}

public class CreateTrainerRequest
{
    [Required, MaxLength(120)] public string Name { get; set; } = null!;
    [Required, EmailAddress, MaxLength(256)] public string Email { get; set; } = null!;
    [Required, MinLength(6), MaxLength(128)] public string Password { get; set; } = null!;
    [MaxLength(120)] public string Specialization { get; set; } = null!;
    [MaxLength(1000)] public string? Bio { get; set; }
    [Range(0, 100_000)] public decimal HourlyRate { get; set; }
}

public class UpdateTrainerRequest
{
    public string? Name { get; set; }
    public string? Specialization { get; set; }
    public string? Bio { get; set; }
    public decimal? HourlyRate { get; set; }
    public bool? IsAvailable { get; set; }
}
