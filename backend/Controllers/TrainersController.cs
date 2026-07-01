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
                t.CommissionPerClient,
                t.PaymentModel,
                t.TrainerType,
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
            trainer.CommissionPerClient,
            trainer.PaymentModel,
            trainer.TrainerType,
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
        var email = request.Email.Trim().ToLowerInvariant();
        var userExists = await _context.Users.AnyAsync(u => u.Email == email);
        if (userExists)
            return BadRequest(new { message = "Email already exists" });

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var user = new User
        {
            Email = email,
            Name = request.Name.Trim(),
            PasswordHash = passwordHash,
            Role = UserRole.Trainer
        };

        var trainer = new Trainer
        {
            User = user,
            Specialization = request.Specialization.Trim(),
            Bio = request.Bio?.Trim() ?? string.Empty,
            HourlyRate = request.HourlyRate,
            CommissionPerClient = request.CommissionPerClient,
            PaymentModel = string.IsNullOrWhiteSpace(request.PaymentModel) ? "prorated" : request.PaymentModel!.Trim(),
            TrainerType = string.IsNullOrWhiteSpace(request.TrainerType) ? "employee" : request.TrainerType!.Trim(),
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

        if (!string.IsNullOrWhiteSpace(request.Name))
            trainer.User.Name = request.Name.Trim();

        trainer.Specialization = string.IsNullOrWhiteSpace(request.Specialization) ? trainer.Specialization : request.Specialization.Trim();
        trainer.Bio = request.Bio?.Trim() ?? trainer.Bio;
        if (request.HourlyRate.HasValue && request.HourlyRate.Value < 0)
            return BadRequest(new { message = "Hourly rate cannot be negative" });
        trainer.HourlyRate = request.HourlyRate ?? trainer.HourlyRate;
        if (request.CommissionPerClient.HasValue && request.CommissionPerClient.Value < 0)
            return BadRequest(new { message = "Commission per client cannot be negative" });
        trainer.CommissionPerClient = request.CommissionPerClient ?? trainer.CommissionPerClient;
        if (!string.IsNullOrWhiteSpace(request.PaymentModel))
            trainer.PaymentModel = request.PaymentModel.Trim();
        if (!string.IsNullOrWhiteSpace(request.TrainerType))
            trainer.TrainerType = request.TrainerType.Trim();
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
            .Include(c => c.Groups)
            .Include(c => c.Goals)
            .OrderBy(c => c.User.Name)
            .ToListAsync();

        var result = new List<object>();
        foreach (var client in clients)
        {
            var latestProgress = await _context.ProgressLogs
                .Where(p => p.ClientId == client.Id)
                .OrderByDescending(p => p.Date)
                .Select(p => new
                {
                    Weight = p.Weight,
                    Chest = p.Chest ?? 0,
                    Waist = p.Waist ?? 0,
                    Hips = p.Hips ?? 0,
                    Arms = p.Arms ?? 0,
                    BodyFat = p.BodyFat ?? 0,
                    UpdatedAt = p.Date
                })
                .FirstOrDefaultAsync();

            var attendance = await _context.Attendance
                .Where(a => a.ClientId == client.Id)
                .Include(a => a.Group)
                .OrderByDescending(a => a.AttendanceDate)
                .Take(12)
                .Select(a => new
                {
                    a.Id,
                    Date = a.AttendanceDate,
                    Present = a.IsPresent,
                    GroupName = a.Group != null ? a.Group.Name : "Manual"
                })
                .ToListAsync();

            var lastCheckIn = await _context.AttendanceLogs
                .Where(a => a.ClientId == client.Id)
                .OrderByDescending(a => a.CheckInTime)
                .Select(a => (DateTime?)a.CheckInTime)
                .FirstOrDefaultAsync();

            var workoutPlans = await _context.WorkoutPlans
                .Where(p => p.ClientId == client.Id && p.TrainerId == id)
                .OrderByDescending(p => p.CreatedAt)
                .Take(8)
                .Select(p => new
                {
                    p.Id,
                    Title = p.Name,
                    Type = "workout",
                    p.CreatedAt,
                    Status = p.IsActive ? "active" : "draft"
                })
                .ToListAsync();

            var dietPlans = await _context.DietPlans
                .Where(p => p.ClientId == client.Id && p.TrainerId == id)
                .OrderByDescending(p => p.CreatedAt)
                .Take(8)
                .Select(p => new
                {
                    p.Id,
                    Title = p.Name,
                    Type = "diet",
                    p.CreatedAt,
                    Status = p.IsActive ? "active" : "draft"
                })
                .ToListAsync();

            result.Add(new
            {
                client.Id,
                client.User.Name,
                Phone = client.User.Phone ?? "",
                client.User.Email,
                ActivePackage = client.MembershipType,
                GroupName = client.Groups.FirstOrDefault()?.Name ?? "—",
                LastCheckIn = lastCheckIn,
                Goals = string.Join(", ", client.Goals.Where(g => g.Status != "completed").Select(g => g.Title)),
                Injuries = "",
                Notes = "",
                Measurements = latestProgress ?? new
                {
                    Weight = 0m,
                    Chest = 0m,
                    Waist = 0m,
                    Hips = 0m,
                    Arms = 0m,
                    BodyFat = 0m,
                    UpdatedAt = client.UpdatedAt
                },
                Attendance = attendance,
                Plans = workoutPlans.Concat(dietPlans).OrderByDescending(p => p.CreatedAt).Take(12)
            });
        }

        return Ok(result);
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
    [Required, MinLength(8), MaxLength(128)] public string Password { get; set; } = null!;
    [MaxLength(120)] public string Specialization { get; set; } = null!;
    [MaxLength(1000)] public string? Bio { get; set; }
    [Range(0, 100_000)] public decimal HourlyRate { get; set; }
    [Range(0, 100_000)] public decimal CommissionPerClient { get; set; }
    [MaxLength(20)] public string? PaymentModel { get; set; }
    [MaxLength(40)] public string? TrainerType { get; set; }
}

public class UpdateTrainerRequest
{
    public string? Name { get; set; }
    public string? Specialization { get; set; }
    public string? Bio { get; set; }
    public decimal? HourlyRate { get; set; }
    public decimal? CommissionPerClient { get; set; }
    public string? PaymentModel { get; set; }
    public string? TrainerType { get; set; }
    public bool? IsAvailable { get; set; }
}
