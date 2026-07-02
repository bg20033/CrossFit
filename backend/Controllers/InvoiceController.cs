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
[Authorize(Policy = "Desk")]
public class InvoiceController : ControllerBase
{
    private readonly FitnessContext _context;
    private readonly IInvoicePaymentService _payments;

    public InvoiceController(FitnessContext context, IInvoicePaymentService payments)
    {
        _context = context;
        _payments = payments;
    }

    // GET: api/invoice/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetInvoice(int id)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Client).ThenInclude(c => c.User)
            .Include(i => i.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice == null)
            return NotFound();

        return Ok(new
        {
            invoice.Id,
            invoice.InvoiceNumber,
            Client = invoice.Client.User.Name,
            invoice.Description,
            invoice.Subtotal,
            invoice.TaxAmount,
            invoice.TotalAmount,
            invoice.Status,
            invoice.DueDate,
            invoice.PaidDate,
            invoice.CreatedAt,
            Items = invoice.Items.Select(i => new { i.Description, i.Quantity, i.UnitPrice, i.Total })
        });
    }

    // POST: api/invoice/create
    [HttpPost("create")]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceRequest request)
    {
        var client = await _context.Clients.FindAsync(request.ClientId);
        if (client == null)
            return BadRequest(new { message = "Client not found" });
        if (request.Items.Count == 0)
            return BadRequest(new { message = "Invoice needs at least one item" });
        if (request.Items.Any(i => i.Quantity < 1 || i.UnitPrice < 0))
            return BadRequest(new { message = "Each item needs quantity ≥ 1 and a non-negative price" });
        if (request.TaxPercent < 0 || request.TaxPercent > 100)
            return BadRequest(new { message = "Tax percent must be between 0 and 100" });

        // Idempotency: dedupe retries/double-clicks.
        if (!string.IsNullOrEmpty(request.IdempotencyKey))
        {
            var dup = await _context.Invoices.FirstOrDefaultAsync(i => i.IdempotencyKey == request.IdempotencyKey);
            if (dup != null)
                return Ok(new { message = "Invoice already created", id = dup.Id, invoiceNumber = dup.InvoiceNumber, totalAmount = dup.TotalAmount, idempotent = true });
        }

        var subtotal = request.Items.Sum(i => i.Quantity * i.UnitPrice);
        var taxAmount = Math.Round(subtotal * (request.TaxPercent / 100), 2);
        var totalAmount = subtotal + taxAmount;

        var invoice = new Invoice
        {
            InvoiceNumber = DocumentNumbers.Invoice(),
            ClientId = request.ClientId,
            StaffId = User.CurrentUserId(),
            Description = request.Description,
            Subtotal = subtotal,
            TaxAmount = taxAmount,
            TotalAmount = totalAmount,
            DueDate = request.DueDate ?? DateTime.UtcNow.AddDays(30),
            PaymentMethod = request.PaymentMethod,
            IdempotencyKey = request.IdempotencyKey,
            Status = "pending"
        };

        foreach (var item in request.Items)
        {
            invoice.Items.Add(new InvoiceItem
            {
                Description = item.Description,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                Total = item.Quantity * item.UnitPrice,
                GroupId = item.GroupId
            });
        }

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Invoice created successfully",
            id = invoice.Id,
            invoiceNumber = invoice.InvoiceNumber,
            totalAmount = invoice.TotalAmount
        });
    }

    // POST: api/invoice/{id}/mark-paid
    // All payment side effects (finance income, membership activation, GAP-7
    // group auto-enroll) live in InvoicePaymentService — shared with /api/payments.
    [HttpPost("{id}/mark-paid")]
    public async Task<IActionResult> MarkAsPaid(int id, [FromBody] MarkPaidRequest request)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id);
        if (invoice == null)
            return NotFound();

        var (applied, error) = await _payments.MarkPaidAsync(invoice, request.PaymentMethod, User.CurrentUserId());
        if (error != null)
            return BadRequest(new { message = error });
        if (!applied)
            return Ok(new { message = "Invoice is already paid", idempotent = true });

        await _context.SaveChangesAsync();

        return Ok(new { message = "Invoice marked as paid" });
    }

    // POST: api/invoice/{id}/cancel — pending invoices only.
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var invoice = await _context.Invoices.FindAsync(id);
        if (invoice == null) return NotFound();
        if (invoice.Status != "pending")
            return BadRequest(new { message = $"Only pending invoices can be cancelled (current: {invoice.Status})" });

        invoice.Status = "cancelled";
        invoice.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Invoice cancelled" });
    }

    // GET: api/invoice/client/{clientId}
    [HttpGet("client/{clientId}")]
    public async Task<IActionResult> GetClientInvoices(int clientId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Invoices.Where(i => i.ClientId == clientId);
        var total = await query.CountAsync();

        var invoices = await query
            .OrderByDescending(i => i.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new
            {
                i.Id,
                i.InvoiceNumber,
                i.TotalAmount,
                i.Status,
                i.CreatedAt,
                i.DueDate
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, invoices });
    }

    // GET: api/invoice/pending
    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingInvoices()
    {
        var invoices = await _context.Invoices
            .Include(i => i.Client).ThenInclude(c => c.User)
            .Where(i => i.Status == "pending")
            .OrderByDescending(i => i.DueDate)
            .Select(i => new
            {
                i.Id,
                i.InvoiceNumber,
                Client = i.Client.User.Name,
                i.TotalAmount,
                i.DueDate
            })
            .ToListAsync();

        var result = invoices.Select(i => new
        {
            i.Id,
            i.InvoiceNumber,
            i.Client,
            i.TotalAmount,
            i.DueDate,
            DaysOverdue = Math.Max(0, (DateTime.UtcNow - i.DueDate).Days)
        });

        return Ok(result);
    }

    // GET: api/invoice/suggest-for-client?clientId={id}
    // Suggests training groups that fit a client, used when creating an invoice.
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

        // Trainers only see their own groups; staff/cashier/admin see all groups.
        if (User.IsInRole("Trainer") && !User.CanManageCoreScope(permission: "schedule.write"))
        {
            var trainerId = await _context.CurrentCoreTrainerIdAsync(User);
            if (trainerId == null) return Forbid();
            allGroups = allGroups.Where(g => g.TrainerId == trainerId.Value).ToList();
        }

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

    private static readonly string[] ValidDays =
        { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" };

    private static int DayIndex(string day) =>
        Array.FindIndex(ValidDays, d => d.Equals(day, StringComparison.OrdinalIgnoreCase));
}

public class CreateInvoiceRequest
{
    public int ClientId { get; set; }
    [MaxLength(300)] public string Description { get; set; } = string.Empty;
    public List<InvoiceItemRequest> Items { get; set; } = new();
    [Range(0, 100)] public decimal TaxPercent { get; set; } = 0;
    [MaxLength(30)] public string PaymentMethod { get; set; } = "cash";
    public DateTime? DueDate { get; set; }
    [MaxLength(80)] public string? IdempotencyKey { get; set; }
}

public class InvoiceItemRequest
{
    [Required, MaxLength(300)] public string Description { get; set; } = null!;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public int? GroupId { get; set; }
}

public class MarkPaidRequest
{
    [MaxLength(30)] public string? PaymentMethod { get; set; }
}
