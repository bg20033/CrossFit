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
                g.TrainerId,
                Trainer = g.Trainer.User.Name,
                g.DayOfWeek,
                g.ScheduleStart,
                g.ScheduleEnd,
                Slots = g.ScheduleSlots
                    .OrderBy(s => s.StartMin)
                    .Select(s => new { s.DayOfWeek, s.StartMin, s.EndMin }),
                g.MaxCapacity,
                MembersCount = g.Clients.Count(),
                WaitlistCount = _context.GroupWaitlistEntries.Count(w => w.TrainingGroupId == g.Id && w.Status == "waiting"),
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
            .Include(g => g.Trainer).ThenInclude(t => t.User)
            .Include(g => g.Clients).ThenInclude(c => c.User)
            .Include(g => g.ScheduleSlots)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return NotFound();

        return Ok(new
        {
            group.Id,
            group.Name,
            group.Description,
            group.TrainerId,
            Trainer = group.Trainer.User.Name,
            group.DayOfWeek,
            group.ScheduleStart,
            group.ScheduleEnd,
            Slots = group.ScheduleSlots
                .OrderBy(s => DayIndex(s.DayOfWeek)).ThenBy(s => s.StartMin)
                .Select(s => new { s.DayOfWeek, s.StartMin, s.EndMin }),
            group.MaxCapacity,
            Members = group.Clients.Select(c => new { c.Id, c.User.Name, c.User.Email }),
            Waitlist = await _context.GroupWaitlistEntries
                .Where(w => w.TrainingGroupId == id && w.Status == "waiting")
                .OrderBy(w => w.RequestedAt)
                .Select(w => new { w.Id, w.ClientId, w.Client.User.Name, w.RequestedAt })
                .ToListAsync(),
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
        if (request.MaxCapacity < 1)
            return BadRequest(new { message = "Capacity must be at least 1" });

        var (slots, error) = BuildSlots(request.Slots, request.DayOfWeek, request.ScheduleStart, request.ScheduleEnd);
        if (error != null) return BadRequest(new { message = error });

        var conflict = await CheckScheduleConflictAsync(request.TrainerId, slots, null, null);
        if (conflict != null && !request.Force)
            return BadRequest(new { message = conflict });

        var group = new TrainingGroup
        {
            Name = request.Name,
            Description = request.Description,
            TrainerId = request.TrainerId,
            MaxCapacity = request.MaxCapacity,
            ScheduleSlots = slots
        };
        ApplyLegacyPrimary(group, slots);

        _context.TrainingGroups.Add(group);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Group created successfully", id = group.Id });
    }

    // PUT: api/traininggroups/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateGroup(int id, [FromBody] UpdateGroupRequest request)
    {
        var group = await _context.TrainingGroups
            .Include(g => g.ScheduleSlots)
            .FirstOrDefaultAsync(g => g.Id == id);
        if (group == null)
            return NotFound();

        if (request.TrainerId.HasValue)
        {
            var trainer = await _context.Trainers.FindAsync(request.TrainerId.Value);
            if (trainer == null) return BadRequest(new { message = "Trainer not found" });
            group.TrainerId = request.TrainerId.Value;
        }

        group.Name = request.Name ?? group.Name;
        group.Description = request.Description ?? group.Description;
        if (request.MaxCapacity.HasValue)
        {
            if (request.MaxCapacity.Value < 1) return BadRequest(new { message = "Capacity must be at least 1" });
            group.MaxCapacity = request.MaxCapacity.Value;
        }

        // Replace the weekly schedule when slots (or legacy schedule fields) are supplied.
        if ((request.Slots != null && request.Slots.Count > 0) ||
            request.DayOfWeek != null || request.ScheduleStart != null || request.ScheduleEnd != null)
        {
            var (slots, error) = BuildSlots(
                request.Slots,
                request.DayOfWeek ?? group.DayOfWeek,
                request.ScheduleStart ?? group.ScheduleStart,
                request.ScheduleEnd ?? group.ScheduleEnd);
            if (error != null) return BadRequest(new { message = error });

            var conflict = await CheckScheduleConflictAsync(group.TrainerId, slots, group.Id, null);
            if (conflict != null && !request.Force)
                return BadRequest(new { message = conflict });

            _context.GroupScheduleSlots.RemoveRange(group.ScheduleSlots);
            group.ScheduleSlots = slots;
            ApplyLegacyPrimary(group, slots);
        }

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
            .Include(g => g.ScheduleSlots)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return NotFound();

        var client = await _context.Clients.FindAsync(request.ClientId);
        if (client == null)
            return BadRequest("Client not found");

        if (group.Clients.Any(c => c.Id == request.ClientId))
            return BadRequest("Client already in group");

        // GAP-8: check schedule conflict for the client being added
        var conflict = await CheckScheduleConflictAsync(
            group.TrainerId, group.ScheduleSlots.ToList(), group.Id, new List<int> { request.ClientId });
        if (conflict != null && !request.Force)
            return BadRequest(new { message = conflict });

        if (group.Clients.Count >= group.MaxCapacity)
        {
            var alreadyWaiting = await _context.GroupWaitlistEntries.AnyAsync(w =>
                w.TrainingGroupId == id && w.ClientId == request.ClientId && w.Status == "waiting");
            if (!alreadyWaiting)
            {
                _context.GroupWaitlistEntries.Add(new GroupWaitlistEntry
                {
                    TrainingGroupId = id,
                    ClientId = request.ClientId
                });
                await _context.SaveChangesAsync();
            }
            return Ok(new { message = "Group is full; client added to waitlist", waitlisted = true });
        }

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
        await PromoteNextWaitlistAsync(group);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Client removed from group successfully" });
    }

    // GET: api/traininggroups/{id}/waitlist
    [HttpGet("{id}/waitlist")]
    public async Task<IActionResult> GetWaitlist(int id)
    {
        var rows = await _context.GroupWaitlistEntries
            .Where(w => w.TrainingGroupId == id)
            .OrderBy(w => w.Status)
            .ThenBy(w => w.RequestedAt)
            .Select(w => new { w.Id, w.ClientId, Client = w.Client.User.Name, w.Status, w.RequestedAt, w.PromotedAt })
            .ToListAsync();
        return Ok(rows);
    }

    // POST: api/traininggroups/{id}/waitlist/promote
    [HttpPost("{id}/waitlist/promote")]
    public async Task<IActionResult> PromoteWaitlist(int id)
    {
        var group = await _context.TrainingGroups.Include(g => g.Clients).FirstOrDefaultAsync(g => g.Id == id);
        if (group == null) return NotFound();
        var promoted = await PromoteNextWaitlistAsync(group);
        await _context.SaveChangesAsync();
        return Ok(new { message = promoted ? "Client promoted from waitlist" : "No waiting client or group is full", promoted });
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

    // GET: api/traininggroups/suggest-for-client?clientId={id}
    [HttpGet("suggest-for-client")]
    public async Task<IActionResult> SuggestForClient([FromQuery] int clientId)
    {
        var client = await _context.Clients
            .Include(c => c.Groups).ThenInclude(g => g.ScheduleSlots)
            .FirstOrDefaultAsync(c => c.Id == clientId);

        if (client == null)
            return NotFound(new { message = "Client not found" });

        var allGroups = await _context.TrainingGroups
            .Include(g => g.Clients)
            .Include(g => g.ScheduleSlots)
            .ToListAsync();

        var clientGroups = client.Groups.ToList();
        var clientSlotTimes = clientGroups
            .SelectMany(g => g.ScheduleSlots)
            .Select(s => new { s.DayOfWeek, s.StartMin, s.EndMin })
            .ToList();

        var suggestions = allGroups
            .Where(g => !g.Clients.Any(c => c.Id == clientId))
            .Where(g => g.Clients.Count < g.MaxCapacity)
            .Where(g =>
            {
                foreach (var slot in g.ScheduleSlots)
                {
                    foreach (var cs in clientSlotTimes)
                    {
                        if (string.Equals(cs.DayOfWeek, slot.DayOfWeek, StringComparison.OrdinalIgnoreCase) &&
                            slot.StartMin < cs.EndMin && cs.StartMin < slot.EndMin)
                        {
                            return false;
                        }
                    }
                }
                return true;
            })
            .Select(g => new
            {
                g.Id,
                g.Name,
                g.Description,
                g.MaxCapacity,
                MembersCount = g.Clients.Count,
                AvailableSlots = g.MaxCapacity - g.Clients.Count,
                Slots = g.ScheduleSlots
                    .OrderBy(s => DayIndex(s.DayOfWeek)).ThenBy(s => s.StartMin)
                    .Select(s => new { s.DayOfWeek, s.StartMin, s.EndMin })
            });

        return Ok(suggestions);
    }

    // Resolve incoming request into a validated set of weekly slots. Falls back to a
    // single slot built from the legacy DayOfWeek/ScheduleStart/ScheduleEnd fields
    // (used by the trainer page, which still sends a single session).
    private static (List<GroupScheduleSlot> slots, string? error) BuildSlots(
        List<GroupSlotDto>? incoming, string? legacyDay, DateTime? legacyStart, DateTime? legacyEnd)
    {
        var dtos = incoming;
        if (dtos == null || dtos.Count == 0)
        {
            if (string.IsNullOrWhiteSpace(legacyDay) || legacyStart == null || legacyEnd == null)
                return (new(), "At least one schedule slot is required");
            dtos = new List<GroupSlotDto>
            {
                new()
                {
                    DayOfWeek = legacyDay!,
                    StartMin = (int)legacyStart.Value.TimeOfDay.TotalMinutes,
                    EndMin = (int)legacyEnd.Value.TimeOfDay.TotalMinutes,
                }
            };
        }

        var slots = new List<GroupScheduleSlot>();
        foreach (var d in dtos)
        {
            if (DayIndex(d.DayOfWeek ?? "") < 0)
                return (new(), $"Invalid day: {d.DayOfWeek}");
            if (d.StartMin < 0 || d.EndMin > 1439 || d.StartMin >= d.EndMin)
                return (new(), "Each slot needs a valid start before end (00:00–23:59)");

            slots.Add(new GroupScheduleSlot
            {
                DayOfWeek = ValidDays[DayIndex(d.DayOfWeek!)], // canonical casing
                StartMin = d.StartMin,
                EndMin = d.EndMin,
            });
        }
        return (slots, null);
    }

    // Keep the legacy single-slot columns in sync with the earliest slot so existing
    // consumers (ICS, reminders, access, ordering) still see a sensible primary session.
    private static void ApplyLegacyPrimary(TrainingGroup group, List<GroupScheduleSlot> slots)
    {
        var primary = slots.OrderBy(s => DayIndex(s.DayOfWeek)).ThenBy(s => s.StartMin).First();
        var baseDate = DateTime.UtcNow.Date;
        group.DayOfWeek = primary.DayOfWeek;
        group.ScheduleStart = baseDate.AddMinutes(primary.StartMin);
        group.ScheduleEnd = baseDate.AddMinutes(primary.EndMin);
    }

    private static string DayNameAlbanian(string day)
    {
        return day.ToLowerInvariant() switch
        {
            "monday" => "E Hënë",
            "tuesday" => "E Martë",
            "wednesday" => "E Mërkurë",
            "thursday" => "E Enjte",
            "friday" => "E Premte",
            "saturday" => "E Shtunë",
            "sunday" => "E Diel",
            _ => day
        };
    }

    // GAP-8: unified schedule-conflict checker.
    // Returns a human-readable Albanian error when:
    //   • the trainer already has another group on an overlapping slot, or
    //   • any client in clientIds already belongs to another group on an overlapping slot.
    // Set excludeGroupId to skip the group currently being edited.
    private async Task<string?> CheckScheduleConflictAsync(
        int trainerId,
        List<GroupScheduleSlot> slots,
        int? excludeGroupId,
        List<int>? clientIds)
    {
        // 1) Trainer conflict
        var trainerSlots = await _context.GroupScheduleSlots
            .Where(s => s.TrainingGroup.TrainerId == trainerId &&
                        (excludeGroupId == null || s.TrainingGroupId != excludeGroupId))
            .Select(s => new { s.DayOfWeek, s.StartMin, s.EndMin, GroupName = s.TrainingGroup.Name })
            .ToListAsync();

        foreach (var ns in slots)
            foreach (var os in trainerSlots)
                if (string.Equals(os.DayOfWeek, ns.DayOfWeek, StringComparison.OrdinalIgnoreCase) &&
                    ns.StartMin < os.EndMin && os.StartMin < ns.EndMin)
                {
                    var t = $"{os.StartMin / 60:D2}:{os.StartMin % 60:D2}";
                    var dayAl = DayNameAlbanian(os.DayOfWeek);
                    return $"Trajneri ka grup tjetër në {dayAl} {t} (\"{os.GroupName}\"). Zgjedh orë tjetër ose trajner tjetër.";
                }

        // 2) Client conflicts
        if (clientIds != null && clientIds.Count > 0)
        {
            var clientGroups = await _context.TrainingGroups
                .Where(g => (excludeGroupId == null || g.Id != excludeGroupId) &&
                              g.Clients.Any(c => clientIds.Contains(c.Id)))
                .Include(g => g.ScheduleSlots)
                .Include(g => g.Clients).ThenInclude(c => c.User)
                .ToListAsync();

            foreach (var ns in slots)
                foreach (var cg in clientGroups)
                    foreach (var os in cg.ScheduleSlots)
                        if (string.Equals(os.DayOfWeek, ns.DayOfWeek, StringComparison.OrdinalIgnoreCase) &&
                            ns.StartMin < os.EndMin && os.StartMin < ns.EndMin)
                        {
                            var conflictingClient = cg.Clients.First(c => clientIds.Contains(c.Id));
                            var clientName = conflictingClient.User?.Name ?? "Klienti";
                            var t = $"{os.StartMin / 60:D2}:{os.StartMin % 60:D2}";
                            var dayAl = DayNameAlbanian(os.DayOfWeek);
                            return $"Klienti {clientName} ka grup tjetër në {dayAl} {t} (\"{cg.Name}\").";
                        }
        }

        return null;
    }

    private async Task<bool> PromoteNextWaitlistAsync(TrainingGroup group)
    {
        if (group.Clients.Count >= group.MaxCapacity) return false;
        var next = await _context.GroupWaitlistEntries
            .Include(w => w.Client)
            .Where(w => w.TrainingGroupId == group.Id && w.Status == "waiting")
            .OrderBy(w => w.RequestedAt)
            .FirstOrDefaultAsync();
        if (next == null) return false;
        if (!group.Clients.Any(c => c.Id == next.ClientId))
            group.Clients.Add(next.Client);
        next.Status = "promoted";
        next.PromotedAt = DateTime.UtcNow;
        return true;
    }

    private static readonly string[] ValidDays =
        { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" };

    private static int DayIndex(string day) =>
        Array.FindIndex(ValidDays, d => d.Equals(day, StringComparison.OrdinalIgnoreCase));
}

// A single recurring weekly session (admin sends a list; trainer page omits it
// and uses the legacy single-slot fields instead).
public class GroupSlotDto
{
    public string? DayOfWeek { get; set; }
    public int StartMin { get; set; }
    public int EndMin { get; set; }
}

public class CreateGroupRequest
{
    public int TrainerId { get; set; }
    public string Name { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
    public int MaxCapacity { get; set; }
    public List<GroupSlotDto>? Slots { get; set; }
    // Legacy single-slot fields (still used by the trainer page).
    public string? DayOfWeek { get; set; }
    public DateTime? ScheduleStart { get; set; }
    public DateTime? ScheduleEnd { get; set; }
    public bool Force { get; set; }
}

public class UpdateGroupRequest
{
    public int? TrainerId { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public int? MaxCapacity { get; set; }
    public List<GroupSlotDto>? Slots { get; set; }
    // Legacy single-slot fields.
    public string? DayOfWeek { get; set; }
    public DateTime? ScheduleStart { get; set; }
    public DateTime? ScheduleEnd { get; set; }
    public bool Force { get; set; }
}

public class AddMemberRequest
{
    public int ClientId { get; set; }
    public bool Force { get; set; }
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
