using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RentalsController : ControllerBase
{
    private readonly FitnessContext _context;

    public RentalsController(FitnessContext context)
    {
        _context = context;
    }

    private int? CurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return int.TryParse(claim?.Value, out var id) ? id : null;
    }

    private async Task<TrainerTenant?> CurrentTenantAsync()
    {
        var userId = CurrentUserId();
        if (userId == null) return null;
        return await _context.TrainerTenants.FirstOrDefaultAsync(t => t.UserId == userId);
    }

    // POST: api/rentals/inquiry  (public — from the marketing page)
    [AllowAnonymous]
    [HttpPost("inquiry")]
    public async Task<IActionResult> CreateInquiry([FromBody] RentalInquiryRequest request)
    {
        var inquiry = new RentalInquiry
        {
            Name = request.Name,
            Email = request.Email,
            Phone = request.Phone ?? "",
            Message = request.Message ?? "",
            Status = "new"
        };
        _context.RentalInquiries.Add(inquiry);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Inquiry received", id = inquiry.Id });
    }

    // GET: api/rentals
    [Authorize(Policy = "AdminOnly")]
    [HttpGet]
    public async Task<IActionResult> GetInquiries([FromQuery] string? status)
    {
        var query = _context.RentalInquiries.AsQueryable();
        if (!string.IsNullOrEmpty(status))
            query = query.Where(r => r.Status == status);

        var inquiries = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new { r.Id, r.Name, r.Email, r.Phone, r.Message, r.Status, r.CreatedAt })
            .ToListAsync();

        return Ok(inquiries);
    }

    // PUT: api/rentals/{id}/status
    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] RentalStatusRequest request)
    {
        var inquiry = await _context.RentalInquiries.FindAsync(id);
        if (inquiry == null) return NotFound();
        inquiry.Status = request.Status;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Updated" });
    }

    // GET: api/rentals/tenants — admin sees qiragjinjtë (tenants), their schedule and occupancy.
    [Authorize(Policy = "AdminOnly")]
    [HttpGet("tenants")]
    public async Task<IActionResult> GetTenants()
    {
        var tenants = await _context.TrainerTenants
            .Include(t => t.User)
            .Include(t => t.ScheduleSlots)
            .Include(t => t.Invoices)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.Id,
                t.UserId,
                Trainer = t.User.Name,
                t.BusinessName,
                t.ContractStatus,
                t.ContractStart,
                t.ContractEnd,
                t.MonthlyRate,
                Slots = t.ScheduleSlots
                    .OrderBy(s => s.StartMin)
                    .Select(s => new { s.DayOfWeek, s.StartMin, s.EndMin }),
                BalanceDue = t.Invoices.Where(i => i.Status != "paid").Sum(i => i.Amount)
            })
            .ToListAsync();

        return Ok(tenants);
    }

    // POST: api/rentals/tenants — admin creates a qiragji: pick a user, give it a name,
    // and configure the weekly schedule directly (time, duration, how many times a week).
    // No more "book a free slot from a shared pool" — this configures everything at once,
    // the same way a TrainingGroup is created.
    [Authorize(Policy = "AdminOnly")]
    [HttpPost("tenants")]
    public async Task<IActionResult> CreateTenant([FromBody] TenantRequest request)
    {
        var user = await _context.Users.FindAsync(request.UserId);
        if (user == null) return BadRequest(new { message = "User not found" });

        var (slots, error) = BuildRentalSlots(request.Slots);
        if (error != null) return BadRequest(new { message = error });

        user.Role = UserRole.TrainerTenant;
        var tenant = new TrainerTenant
        {
            UserId = user.Id,
            BusinessName = request.BusinessName ?? user.Name,
            ContractStatus = request.ContractStatus ?? "active",
            ContractStart = request.ContractStart ?? DateTime.UtcNow,
            ContractEnd = request.ContractEnd,
            MonthlyRate = request.MonthlyRate,
            ScheduleSlots = slots
        };

        _context.TrainerTenants.Add(tenant);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Qiragjia u krijua", id = tenant.Id });
    }

    // PUT: api/rentals/tenants/{id} — admin edits a qiragji's name/contract/schedule.
    [Authorize(Policy = "AdminOnly")]
    [HttpPut("tenants/{id:int}")]
    public async Task<IActionResult> UpdateTenant(int id, [FromBody] TenantRequest request)
    {
        var tenant = await _context.TrainerTenants.Include(t => t.ScheduleSlots).FirstOrDefaultAsync(t => t.Id == id);
        if (tenant == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(request.BusinessName)) tenant.BusinessName = request.BusinessName;
        if (request.ContractStatus != null) tenant.ContractStatus = request.ContractStatus;
        if (request.ContractStart.HasValue) tenant.ContractStart = request.ContractStart.Value;
        tenant.ContractEnd = request.ContractEnd ?? tenant.ContractEnd;
        if (request.MonthlyRate > 0) tenant.MonthlyRate = request.MonthlyRate;

        if (request.Slots != null && request.Slots.Count > 0)
        {
            var (slots, error) = BuildRentalSlots(request.Slots);
            if (error != null) return BadRequest(new { message = error });
            _context.RentalScheduleSlots.RemoveRange(tenant.ScheduleSlots);
            tenant.ScheduleSlots = slots;
        }

        tenant.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Qiragjia u përditësua" });
    }

    // GET: api/rentals/tenant/schedule — the qiragji sees their own name + weekly schedule.
    [Authorize(Policy = "TenantOnly")]
    [HttpGet("tenant/schedule")]
    public async Task<IActionResult> GetOwnSchedule()
    {
        var tenant = await CurrentTenantAsync();
        if (tenant == null) return Forbid();

        var full = await _context.TrainerTenants
            .Include(t => t.ScheduleSlots)
            .FirstOrDefaultAsync(t => t.Id == tenant.Id);
        if (full == null) return NotFound();

        return Ok(new
        {
            full.Id,
            full.BusinessName,
            full.ContractStatus,
            full.MonthlyRate,
            Slots = full.ScheduleSlots.OrderBy(s => s.StartMin).Select(s => new { s.DayOfWeek, s.StartMin, s.EndMin })
        });
    }

    // PUT: api/rentals/tenant/schedule — the qiragji self-configures: name + weekly schedule.
    // Just give it a name, the time, how long, and how many times a week — this replaces
    // the whole schedule in one call, same as a trainer editing their own group.
    [Authorize(Policy = "TenantOnly")]
    [HttpPut("tenant/schedule")]
    public async Task<IActionResult> UpdateOwnSchedule([FromBody] TenantScheduleRequest request)
    {
        var tenant = await CurrentTenantAsync();
        if (tenant == null) return Forbid();

        var full = await _context.TrainerTenants.Include(t => t.ScheduleSlots).FirstOrDefaultAsync(t => t.Id == tenant.Id);
        if (full == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(request.Name)) full.BusinessName = request.Name.Trim();

        var (slots, error) = BuildRentalSlots(request.Slots);
        if (error != null) return BadRequest(new { message = error });

        _context.RentalScheduleSlots.RemoveRange(full.ScheduleSlots);
        full.ScheduleSlots = slots;
        full.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Orari u konfigurua" });
    }

    private static readonly string[] ValidDays =
        { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" };

    private static int DayIndex(string day) =>
        Array.FindIndex(ValidDays, d => d.Equals(day, StringComparison.OrdinalIgnoreCase));

    private static (List<RentalScheduleSlot> slots, string? error) BuildRentalSlots(List<RentalSlotDto>? incoming)
    {
        if (incoming == null || incoming.Count == 0)
            return (new(), "Të paktën një terminë javor kërkohet (dita, ora e fillimit, ora e mbarimit)");

        var slots = new List<RentalScheduleSlot>();
        foreach (var d in incoming)
        {
            if (DayIndex(d.DayOfWeek ?? "") < 0)
                return (new(), $"Ditë e pavlefshme: {d.DayOfWeek}");
            if (d.StartMin < 0 || d.EndMin > 1439 || d.StartMin >= d.EndMin)
                return (new(), "Çdo terminë duhet të ketë orën e fillimit para mbarimit (00:00–23:59)");

            slots.Add(new RentalScheduleSlot
            {
                DayOfWeek = ValidDays[DayIndex(d.DayOfWeek!)],
                StartMin = d.StartMin,
                EndMin = d.EndMin,
            });
        }
        return (slots, null);
    }

    [Authorize(Policy = "TenantOnly")]
    [HttpGet("tenant/clients")]
    public async Task<IActionResult> GetTenantClients()
    {
        var tenant = await CurrentTenantAsync();
        if (tenant == null) return Forbid();
        var clients = await _context.TenantClients
            .Where(c => c.TrainerTenantId == tenant.Id)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new { c.Id, c.Name, c.Email, c.Phone, c.Goal, c.Notes, c.IsActive, c.CreatedAt })
            .ToListAsync();
        return Ok(clients);
    }

    [Authorize(Policy = "TenantOnly")]
    [HttpPost("tenant/clients")]
    public async Task<IActionResult> CreateTenantClient([FromBody] TenantClientRequest request)
    {
        var tenant = await CurrentTenantAsync();
        if (tenant == null) return Forbid();
        var client = new TenantClient
        {
            TrainerTenantId = tenant.Id,
            Name = request.Name,
            Email = request.Email ?? "",
            Phone = request.Phone ?? "",
            Goal = request.Goal ?? "",
            Notes = request.Notes ?? ""
        };
        _context.TenantClients.Add(client);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Tenant client created", id = client.Id });
    }

    [Authorize(Policy = "TenantOnly")]
    [HttpGet("tenant/invoices")]
    public async Task<IActionResult> GetTenantInvoices()
    {
        var tenant = await CurrentTenantAsync();
        if (tenant == null) return Forbid();
        var invoices = await _context.RentalInvoices
            .Where(i => i.TrainerTenantId == tenant.Id)
            .OrderByDescending(i => i.PeriodStart)
            .Select(i => new { i.Id, i.InvoiceNumber, i.Amount, i.PeriodStart, i.PeriodEnd, i.DueDate, i.Status, i.PaidAt })
            .ToListAsync();
        return Ok(invoices);
    }

    [Authorize(Policy = "TenantOnly")]
    [HttpPost("tenant/invoices/{id:int}/pay")]
    public async Task<IActionResult> PayTenantInvoice(int id)
    {
        var tenant = await CurrentTenantAsync();
        if (tenant == null) return Forbid();
        var invoice = await _context.RentalInvoices.FirstOrDefaultAsync(i => i.Id == id && i.TrainerTenantId == tenant.Id);
        if (invoice == null) return NotFound();
        if (invoice.Status == "paid") return Ok(new { message = "Already paid" });

        invoice.Status = "paid";
        invoice.PaidAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Invoice paid" });
    }
}

public class RentalInquiryRequest
{
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public string? Message { get; set; }
}

public class RentalStatusRequest
{
    public string Status { get; set; } = null!;
}

public class TenantRequest
{
    public int UserId { get; set; }
    public string? BusinessName { get; set; }
    public string? ContractStatus { get; set; }
    public DateTime? ContractStart { get; set; }
    public DateTime? ContractEnd { get; set; }
    [Range(0, 1_000_000)] public decimal MonthlyRate { get; set; }
    public List<RentalSlotDto>? Slots { get; set; }
}

// A single recurring weekly session for a qiragji's own space (day + start + end).
public class RentalSlotDto
{
    public string? DayOfWeek { get; set; }
    public int StartMin { get; set; }
    public int EndMin { get; set; }
}

public class TenantScheduleRequest
{
    [MaxLength(120)] public string? Name { get; set; }
    public List<RentalSlotDto>? Slots { get; set; }
}

public class TenantClientRequest
{
    [Required, MaxLength(120)] public string Name { get; set; } = null!;
    [EmailAddress, MaxLength(256)] public string? Email { get; set; }
    [MaxLength(40)] public string? Phone { get; set; }
    [MaxLength(200)] public string? Goal { get; set; }
    [MaxLength(2000)] public string? Notes { get; set; }
}
