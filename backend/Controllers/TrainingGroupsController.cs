using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminTrainer")]
public class TrainingGroupsController : ControllerBase
{
    private readonly FitnessContext _context;

    public TrainingGroupsController(FitnessContext context)
    {
        _context = context;
    }

    // GET: api/traininggroups
    [HttpGet]
    public async Task<IActionResult> GetGroups([FromQuery] int? trainerId)
    {
        var query = _context.TrainingGroups
            .Include(g => g.Trainer)
            .Include(g => g.Clients)
            .AsQueryable();

        if (trainerId.HasValue)
            query = query.Where(g => g.TrainerId == trainerId);

        var groups = await query
            .OrderBy(g => g.ScheduleStart)
            .Select(g => new
            {
                g.Id,
                g.Name,
                g.Description,
                Trainer = g.Trainer.User.Name,
                g.DayOfWeek,
                g.ScheduleStart,
                g.ScheduleEnd,
                g.MaxCapacity,
                MembersCount = g.Clients.Count(),
                g.CreatedAt
            })
            .ToListAsync();

        return Ok(groups);
    }

    // GET: api/traininggroups/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetGroup(int id)
    {
        var group = await _context.TrainingGroups
            .Include(g => g.Trainer)
            .Include(g => g.Clients)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return NotFound();

        return Ok(new
        {
            group.Id,
            group.Name,
            group.Description,
            Trainer = group.Trainer.User.Name,
            group.DayOfWeek,
            group.ScheduleStart,
            group.ScheduleEnd,
            group.MaxCapacity,
            Members = group.Clients.Select(c => new { c.Id, c.User.Name, c.User.Email }),
            group.CreatedAt
        });
    }

    // POST: api/traininggroups/create
    [HttpPost("create")]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupRequest request)
    {
        var trainer = await _context.Trainers.FindAsync(request.TrainerId);
        if (trainer == null)
            return BadRequest("Trainer not found");

        var group = new TrainingGroup
        {
            Name = request.Name,
            Description = request.Description,
            TrainerId = request.TrainerId,
            DayOfWeek = request.DayOfWeek,
            ScheduleStart = request.ScheduleStart,
            ScheduleEnd = request.ScheduleEnd,
            MaxCapacity = request.MaxCapacity
        };

        _context.TrainingGroups.Add(group);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Group created successfully", id = group.Id });
    }

    // PUT: api/traininggroups/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateGroup(int id, [FromBody] UpdateGroupRequest request)
    {
        var group = await _context.TrainingGroups.FindAsync(id);
        if (group == null)
            return NotFound();

        group.Name = request.Name ?? group.Name;
        group.Description = request.Description ?? group.Description;
        group.DayOfWeek = request.DayOfWeek ?? group.DayOfWeek;
        group.ScheduleStart = request.ScheduleStart ?? group.ScheduleStart;
        group.ScheduleEnd = request.ScheduleEnd ?? group.ScheduleEnd;
        group.MaxCapacity = request.MaxCapacity ?? group.MaxCapacity;
        group.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Group updated successfully" });
    }

    // POST: api/traininggroups/{id}/add-member
    [HttpPost("{id}/add-member")]
    public async Task<IActionResult> AddMember(int id, [FromBody] AddMemberRequest request)
    {
        var group = await _context.TrainingGroups
            .Include(g => g.Clients)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return NotFound();

        if (group.Clients.Count >= group.MaxCapacity)
            return BadRequest("Group is full");

        var client = await _context.Clients.FindAsync(request.ClientId);
        if (client == null)
            return BadRequest("Client not found");

        if (group.Clients.Any(c => c.Id == request.ClientId))
            return BadRequest("Client already in group");

        group.Clients.Add(client);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Client added to group successfully" });
    }

    // POST: api/traininggroups/{id}/remove-member
    [HttpPost("{id}/remove-member")]
    public async Task<IActionResult> RemoveMember(int id, [FromBody] RemoveMemberRequest request)
    {
        var group = await _context.TrainingGroups
            .Include(g => g.Clients)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return NotFound();

        var client = group.Clients.FirstOrDefault(c => c.Id == request.ClientId);
        if (client == null)
            return BadRequest("Client not in group");

        group.Clients.Remove(client);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Client removed from group successfully" });
    }

    // POST: api/traininggroups/{id}/record-attendance
    [HttpPost("{id}/record-attendance")]
    public async Task<IActionResult> RecordAttendance(int id, [FromBody] RecordAttendanceRequest request)
    {
        var group = await _context.TrainingGroups.FindAsync(id);
        if (group == null)
            return NotFound();

        var attendance = new Attendance
        {
            GroupId = id,
            ClientId = request.ClientId,
            AttendanceDate = DateTime.UtcNow,
            IsPresent = request.IsPresent
        };

        _context.Attendance.Add(attendance);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Attendance recorded successfully" });
    }

    // GET: api/traininggroups/{id}/attendance?month=6&year=2026
    [HttpGet("{id}/attendance")]
    public async Task<IActionResult> GetGroupAttendance(int id, [FromQuery] int? month, [FromQuery] int? year)
    {
        var group = await _context.TrainingGroups.FindAsync(id);
        if (group == null)
            return NotFound();

        year ??= DateTime.UtcNow.Year;
        month ??= DateTime.UtcNow.Month;

        var startDate = new DateTime(year.Value, month.Value, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var attendance = await _context.Attendance
            .Where(a => a.GroupId == id && a.AttendanceDate >= startDate && a.AttendanceDate <= endDate)
            .Include(a => a.Client)
            .GroupBy(a => a.ClientId)
            .Select(g => new
            {
                ClientName = g.First().Client.User.Name,
                TotalSessions = g.Count(),
                Present = g.Count(a => a.IsPresent),
                Absent = g.Count(a => !a.IsPresent),
                AttendanceRate = ((decimal)g.Count(a => a.IsPresent) / g.Count() * 100)
            })
            .ToListAsync();

        return Ok(new { month = $"{year}-{month:D2}", attendance });
    }
}

public class CreateGroupRequest
{
    public int TrainerId { get; set; }
    public string Name { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
    public string DayOfWeek { get; set; } = null!;
    public DateTime ScheduleStart { get; set; }
    public DateTime ScheduleEnd { get; set; }
    public int MaxCapacity { get; set; }
}

public class UpdateGroupRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? DayOfWeek { get; set; }
    public DateTime? ScheduleStart { get; set; }
    public DateTime? ScheduleEnd { get; set; }
    public int? MaxCapacity { get; set; }
}

public class AddMemberRequest
{
    public int ClientId { get; set; }
}

public class RemoveMemberRequest
{
    public int ClientId { get; set; }
}

public class RecordAttendanceRequest
{
    public int ClientId { get; set; }
    public bool IsPresent { get; set; }
}
