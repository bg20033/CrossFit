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
[Authorize]
public class RentalsController : ControllerBase
{
    private readonly FitnessContext _context;
    private readonly IFinanceService _finance;

    public RentalsController(FitnessContext context, IFinanceService finance)
    {
        _context = context;
        _finance = finance;
    }

    private async Task<TrainerTenant?> CurrentTenantAsync()
    {
        var userId = User.CurrentUserId();
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

    // POST: api/rentals/{id}/convert — kërkesa publike bëhet qiragji me një hap.
    // Gjen (ose krijon) userin me email-in e kërkesës, e kthen në TrainerTenant me
    // orarin javor + qiranë mujore, dhe e shënon kërkesën "converted" — që kërkesat
    // të mos mbeten listë e vdekur por të lidhen me pjesën tjetër të sistemit.
    [Authorize(Policy = "AdminOnly")]
    [HttpPost("{id:int}/convert")]
    public async Task<IActionResult> ConvertInquiry(int id, [FromBody] ConvertInquiryRequest request)
    {
        var inquiry = await _context.RentalInquiries.FindAsync(id);
        if (inquiry == null) return NotFound();
        if (inquiry.Status == "converted")
            return BadRequest(new { message = "Kjo kërkesë është konvertuar tashmë në qiragji." });

        var (slots, error) = BuildRentalSlots(request.Slots);
        if (error != null) return BadRequest(new { message = error });

        var email = inquiry.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            // Person i jashtëm — krijohet llogaria e re me rolin Qiragji.
            if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
                return BadRequest(new { message = "Fjalëkalimi i përkohshëm duhet të ketë së paku 8 karaktere (llogaria e re krijohet me email-in e kërkesës)." });

            user = new User
            {
                Email = email,
                Name = inquiry.Name.Trim(),
                Phone = string.IsNullOrWhiteSpace(inquiry.Phone) ? null : inquiry.Phone.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = UserRole.TrainerTenant
            };
            _context.Users.Add(user);
        }
        else
        {
            // Ekziston llogari me këtë email — vlejnë rregullat e CreateTenant.
            if (await _context.TrainerTenants.AnyAsync(t => t.UserId == user.Id))
                return BadRequest(new { message = "Përdoruesi me këtë email është tashmë qiragji." });
            if (user.Role != UserRole.Trainer && user.Role != UserRole.TrainerTenant)
                return BadRequest(new { message = $"Ekziston një llogari ({email}) që s'është trajner — qiragji bëhet vetëm një trajner ekzistues ose një llogari e re." });
            user.Role = UserRole.TrainerTenant;
        }

        var tenant = new TrainerTenant
        {
            User = user,
            BusinessName = string.IsNullOrWhiteSpace(request.BusinessName) ? inquiry.Name.Trim() : request.BusinessName.Trim(),
            ContractStatus = "active",
            ContractStart = DateTime.UtcNow,
            MonthlyRate = request.MonthlyRate,
            ScheduleSlots = slots
        };
        _context.TrainerTenants.Add(tenant);

        inquiry.Status = "converted";
        await _context.SaveChangesAsync();

        return Ok(new { message = "Kërkesa u konvertua në qiragji", tenantId = tenant.Id });
    }

    // GET: api/rentals/tenants — admin sees qiragjinjtë (tenants), their schedule and occupancy.
    [Authorize(Policy = "AdminOnly")]
    [HttpGet("tenants")]
    public async Task<IActionResult> GetTenants()
    {
        var tenantRows = await _context.TrainerTenants
            .Include(t => t.User)
            .Include(t => t.ScheduleSlots)
            .Include(t => t.Invoices)
            .AsNoTracking()
            .AsSplitQuery()
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        var tenants = tenantRows.Select(t => new
            {
                t.Id,
                t.UserId,
                Trainer = t.User?.Name ?? t.BusinessName,
                t.BusinessName,
                t.ContractStatus,
                t.ContractStart,
                t.ContractEnd,
                t.MonthlyRate,
                Slots = t.ScheduleSlots
                    .OrderBy(s => s.StartMin)
                    .Select(s => new { s.DayOfWeek, s.StartMin, s.EndMin })
                    .ToList(),
                BalanceDue = t.Invoices.Where(i => i.Status != "paid").Sum(i => i.Amount)
            })
            .ToList();

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
        if (user.Role != UserRole.Trainer && user.Role != UserRole.TrainerTenant)
            return BadRequest(new { message = "Qiragji mund të krijohet vetëm nga një trajner ekzistues." });
        if (await _context.TrainerTenants.AnyAsync(t => t.UserId == user.Id))
            return BadRequest(new { message = "Ky trajner është tashmë qiragji." });

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
            MonthlyRate = request.MonthlyRate ?? 0,
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
        if (request.MonthlyRate.HasValue) tenant.MonthlyRate = request.MonthlyRate.Value;

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

        await SettleRentalInvoiceAsync(invoice, tenant.BusinessName, "cash");
        await _context.SaveChangesAsync();
        return Ok(new { message = "Invoice paid" });
    }

    // GET: api/rentals/tenants/{id}/invoices — admin sees a tenant's rent invoices.
    [Authorize(Policy = "AdminOnly")]
    [HttpGet("tenants/{id:int}/invoices")]
    public async Task<IActionResult> GetTenantInvoicesAdmin(int id)
    {
        if (!await _context.TrainerTenants.AnyAsync(t => t.Id == id)) return NotFound();
        var invoices = await _context.RentalInvoices
            .Where(i => i.TrainerTenantId == id)
            .OrderByDescending(i => i.PeriodStart)
            .Select(i => new { i.Id, i.InvoiceNumber, i.Amount, i.PeriodStart, i.PeriodEnd, i.DueDate, i.Status, i.PaidAt })
            .ToListAsync();
        return Ok(invoices);
    }

    // POST: api/rentals/invoices/{id}/pay — admin/desk collects the rent
    // (cash/card/bank); income lands in Finance like every other payment.
    [Authorize(Policy = "AdminOnly")]
    [HttpPost("invoices/{id:int}/pay")]
    public async Task<IActionResult> PayRentalInvoiceAdmin(int id, [FromBody] RentPaymentRequest? request)
    {
        var invoice = await _context.RentalInvoices
            .Include(i => i.TrainerTenant)
            .FirstOrDefaultAsync(i => i.Id == id);
        if (invoice == null) return NotFound();
        if (invoice.Status == "paid") return BadRequest(new { message = "Fatura është e paguar tashmë." });
        if (invoice.Status == "void") return BadRequest(new { message = "Fatura është anuluar." });

        var method = request?.PaymentMethod?.ToLowerInvariant() switch
        {
            "card" => "card",
            "bank" => "bank",
            _ => "cash",
        };
        await SettleRentalInvoiceAsync(invoice, invoice.TrainerTenant.BusinessName, method);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Qiraja u arkëtua" });
    }

    // Shared settle: mark paid + book rent as Finance income (previously rental
    // payments never reached the books, so finance understated revenue).
    // Does not SaveChanges — the caller commits.
    private async Task SettleRentalInvoiceAsync(RentalInvoice invoice, string businessName, string paymentMethod)
    {
        invoice.Status = "paid";
        invoice.PaidAt = DateTime.UtcNow;
        invoice.UpdatedAt = DateTime.UtcNow;

        await _finance.RecordIncomeAsync(
            FinanceService.Rental,
            invoice.Amount,
            $"Qira — {businessName} ({invoice.InvoiceNumber})",
            paymentMethod,
            User.CurrentUserId());
    }
}

public class RentPaymentRequest
{
    public string? PaymentMethod { get; set; } // cash | card | bank
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

// Konvertimi i një kërkese publike në qiragji. Password kërkohet vetëm kur
// s'ekziston llogari me email-in e kërkesës (krijohet e re me rolin Qiragji).
public class ConvertInquiryRequest
{
    [MaxLength(120)] public string? BusinessName { get; set; }
    [Range(0, 1_000_000)] public decimal MonthlyRate { get; set; }
    [MaxLength(100)] public string? Password { get; set; }
    public List<RentalSlotDto>? Slots { get; set; }
}

public class TenantRequest
{
    public int UserId { get; set; }
    public string? BusinessName { get; set; }
    public string? ContractStatus { get; set; }
    public DateTime? ContractStart { get; set; }
    public DateTime? ContractEnd { get; set; }
    // Nullable që update-i të dallojë "s'u dërgua" nga "0" (qira falas lejohet).
    [Range(0, 1_000_000)] public decimal? MonthlyRate { get; set; }
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
