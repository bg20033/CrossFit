using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/trainer-reports")]
[Authorize(Policy = "AdminTrainer")]
public class TrainerReportsController : ControllerBase
{
    private readonly FitnessContext _context;

    public TrainerReportsController(FitnessContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? trainerId, [FromQuery] int? clientId)
    {
        var query = _context.TrainerWeeklyReports
            .Include(r => r.Trainer).ThenInclude(t => t.User)
            .Include(r => r.Client).ThenInclude(c => c.User)
            .AsNoTracking()
            .AsQueryable();

        if (trainerId.HasValue) query = query.Where(r => r.TrainerId == trainerId);
        if (clientId.HasValue) query = query.Where(r => r.ClientId == clientId);

        var rows = await query
            .OrderByDescending(r => r.WeekStart)
            .Take(100)
            .Select(r => new
            {
                r.Id,
                r.Title,
                r.WeekStart,
                Trainer = r.Trainer.User.Name,
                Client = r.Client.User.Name,
                r.PdfFile,
                r.CreatedAt
            })
            .ToListAsync();

        return Ok(rows);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var report = await _context.TrainerWeeklyReports
            .Include(r => r.Trainer).ThenInclude(t => t.User)
            .Include(r => r.Client).ThenInclude(c => c.User)
            .Include(r => r.WorkoutPlan)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);

        if (report == null) return NotFound();
        return Ok(Shape(report));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] WeeklyReportRequest request)
    {
        if (!await _context.Trainers.AnyAsync(t => t.Id == request.TrainerId))
            return BadRequest("Trainer not found");
        if (!await _context.Clients.AnyAsync(c => c.Id == request.ClientId))
            return BadRequest("Client not found");

        var report = new TrainerWeeklyReport
        {
            TrainerId = request.TrainerId,
            ClientId = request.ClientId,
            WorkoutPlanId = request.WorkoutPlanId,
            WeekStart = request.WeekStart.Date,
            Title = request.Title,
            Summary = request.Summary ?? "",
            GoalsJson = request.GoalsJson ?? "[]",
            WorkoutsJson = request.WorkoutsJson ?? "[]",
            NutritionJson = request.NutritionJson ?? "{}"
        };

        _context.TrainerWeeklyReports.Add(report);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Weekly report created", id = report.Id });
    }

    [HttpPut("{id:int}/pdf")]
    public async Task<IActionResult> AttachPdf(int id, [FromBody] AttachPdfRequest request)
    {
        var report = await _context.TrainerWeeklyReports.FindAsync(id);
        if (report == null) return NotFound();
        report.PdfFile = request.PdfFile;
        report.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "PDF attached" });
    }

    [HttpGet("{id:int}/pdf-data")]
    public async Task<IActionResult> PdfData(int id)
    {
        var report = await _context.TrainerWeeklyReports
            .Include(r => r.Trainer).ThenInclude(t => t.User)
            .Include(r => r.Client).ThenInclude(c => c.User)
            .Include(r => r.WorkoutPlan)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);
        if (report == null) return NotFound();
        return Ok(new { message = "PDF data ready", report = Shape(report) });
    }

    private static object Shape(TrainerWeeklyReport r) => new
    {
        r.Id,
        r.Title,
        r.Summary,
        r.WeekStart,
        Trainer = r.Trainer.User.Name,
        Client = r.Client.User.Name,
        WorkoutPlan = r.WorkoutPlan == null ? null : new { r.WorkoutPlan.Id, r.WorkoutPlan.Name },
        r.GoalsJson,
        r.WorkoutsJson,
        r.NutritionJson,
        r.PdfFile,
        r.CreatedAt
    };
}

public class WeeklyReportRequest
{
    public int TrainerId { get; set; }
    public int ClientId { get; set; }
    public int? WorkoutPlanId { get; set; }
    public DateTime WeekStart { get; set; }
    [Required, MaxLength(160)] public string Title { get; set; } = null!;
    [MaxLength(4000)] public string? Summary { get; set; }
    public string? GoalsJson { get; set; }
    public string? WorkoutsJson { get; set; }
    public string? NutritionJson { get; set; }
}

public class AttachPdfRequest
{
    [Required, MaxLength(500)] public string PdfFile { get; set; } = null!;
}
