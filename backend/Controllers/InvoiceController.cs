using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminStaff")]
public class InvoiceController : ControllerBase
{
    private readonly FitnessContext _context;

    public InvoiceController(FitnessContext context)
    {
        _context = context;
    }

    // GET: api/invoice/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetInvoice(int id)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Client)
            .Include(i => i.Items)
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
            return BadRequest("Client not found");

        // Idempotency: dedupe retries/double-clicks.
        if (!string.IsNullOrEmpty(request.IdempotencyKey))
        {
            var dup = await _context.Invoices.FirstOrDefaultAsync(i => i.IdempotencyKey == request.IdempotencyKey);
            if (dup != null)
                return Ok(new { message = "Invoice already created", id = dup.Id, invoiceNumber = dup.InvoiceNumber, totalAmount = dup.TotalAmount, idempotent = true });
        }

        var invoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}";
        var subtotal = request.Items.Sum(i => i.Quantity * i.UnitPrice);
        var taxAmount = subtotal * (request.TaxPercent / 100);
        var totalAmount = subtotal + taxAmount;

        var invoice = new Invoice
        {
            InvoiceNumber = invoiceNumber,
            ClientId = request.ClientId,
            StaffId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0"),
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
                Total = item.Quantity * item.UnitPrice
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
    [HttpPost("{id}/mark-paid")]
    public async Task<IActionResult> MarkAsPaid(int id, [FromBody] MarkPaidRequest request)
    {
        var invoice = await _context.Invoices.FindAsync(id);
        if (invoice == null)
            return NotFound();

        invoice.Status = "paid";
        invoice.PaidDate = DateTime.UtcNow;
        invoice.PaymentMethod = request.PaymentMethod ?? invoice.PaymentMethod;

        // Create finance transaction
        var finance = new Finance
        {
            Type = "income",
            CategoryId = (await _context.FinanceCategories.FirstOrDefaultAsync(fc => fc.Name == "Member Payments"))?.Id ?? 1,
            Amount = invoice.TotalAmount,
            Description = $"Payment for {invoice.InvoiceNumber}",
            PaymentMethod = invoice.PaymentMethod,
            TransactionDate = DateTime.UtcNow,
            Status = "completed"
        };

        _context.Finances.Add(finance);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Invoice marked as paid" });
    }

    // GET: api/invoice/client/{clientId}
    [HttpGet("client/{clientId}")]
    public async Task<IActionResult> GetClientInvoices(int clientId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var total = await _context.Invoices
            .Where(i => i.ClientId == clientId)
            .CountAsync();

        var invoices = await _context.Invoices
            .Where(i => i.ClientId == clientId)
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
            .Where(i => i.Status == "pending")
            .Include(i => i.Client)
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
            DaysOverdue = (DateTime.UtcNow - i.DueDate).Days
        });

        return Ok(result);
    }
}

public class CreateInvoiceRequest
{
    public int ClientId { get; set; }
    public string Description { get; set; } = string.Empty;
    public List<InvoiceItemRequest> Items { get; set; } = new();
    public decimal TaxPercent { get; set; } = 0;
    public string PaymentMethod { get; set; } = "cash";
    public DateTime? DueDate { get; set; }
    public string? IdempotencyKey { get; set; }
}

public class InvoiceItemRequest
{
    public string Description { get; set; } = null!;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class MarkPaidRequest
{
    public string? PaymentMethod { get; set; }
}
