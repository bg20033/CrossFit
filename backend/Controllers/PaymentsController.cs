using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using StandUpFitness.Data;
using StandUpFitness.Models;
using StandUpFitness.Services;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize(Policy = "Desk")]
public class PaymentsController : ControllerBase
{
    private readonly FitnessContext _context;
    private readonly IPaymentGatewayService _gateway;

    public PaymentsController(FitnessContext context, IPaymentGatewayService gateway)
    {
        _context = context;
        _gateway = gateway;
    }

    private int? CurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return int.TryParse(claim?.Value, out var id) ? id : null;
    }

    [HttpPost("checkout")]
    public async Task<IActionResult> CreateCheckout([FromBody] CheckoutRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
        {
            var existing = await _context.PaymentTransactions
                .FirstOrDefaultAsync(p => p.IdempotencyKey == request.IdempotencyKey);
            if (existing != null) return Ok(Shape(existing));
        }

        Invoice? invoice = null;
        if (request.InvoiceId.HasValue)
        {
            invoice = await _context.Invoices.Include(i => i.Client).ThenInclude(c => c.User)
                .FirstOrDefaultAsync(i => i.Id == request.InvoiceId.Value);
            if (invoice == null) return NotFound("Invoice not found");
        }

        var amount = request.Amount ?? invoice?.TotalAmount;
        if (amount == null || amount <= 0) return BadRequest("Amount is required");

        var receiptNumber = $"RC-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
        var gateway = await _gateway.CreateAsync(request.Method, amount.Value, "EUR", receiptNumber);
        if (gateway.Status == "unconfigured")
            return BadRequest(new { message = "Pagesat online nuk janë konfiguruar. Përdor cash, card ose transfer, ose vendos Payments:Provider." });

        var tx = new PaymentTransaction
        {
            InvoiceId = invoice?.Id,
            ClientId = request.ClientId ?? invoice?.ClientId,
            StaffId = CurrentUserId(),
            Amount = amount.Value,
            Currency = "EUR",
            Method = request.Method,
            Status = gateway.Status,
            Provider = request.Provider ?? gateway.Provider,
            ProviderReference = gateway.ProviderReference,
            IdempotencyKey = request.IdempotencyKey,
            ReceiptNumber = receiptNumber
        };
        tx.ReceiptHtml = BuildReceiptHtml(tx, invoice);

        _context.PaymentTransactions.Add(tx);

        if (tx.Status == "paid" && invoice != null)
        {
            invoice.Status = "paid";
            invoice.PaidDate = DateTime.UtcNow;
            invoice.PaymentMethod = tx.Method;
            invoice.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(Shape(tx, gateway.CheckoutUrl));
    }

    [HttpPost("{id:int}/confirm")]
    public async Task<IActionResult> Confirm(int id, [FromBody] ConfirmPaymentRequest request)
    {
        var tx = await _context.PaymentTransactions.Include(p => p.Invoice).FirstOrDefaultAsync(p => p.Id == id);
        if (tx == null) return NotFound();
        if (tx.Status == "paid") return Ok(Shape(tx));

        tx.Status = request.Success ? "paid" : "failed";
        tx.ProviderReference = request.ProviderReference ?? tx.ProviderReference;
        tx.UpdatedAt = DateTime.UtcNow;

        if (request.Success && tx.Invoice != null)
        {
            tx.Invoice.Status = "paid";
            tx.Invoice.PaidDate = DateTime.UtcNow;
            tx.Invoice.PaymentMethod = tx.Method;
            tx.Invoice.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(Shape(tx));
    }

    // POST: api/payments/{id}/refund — cashier up to GymSettings.RefundThreshold; admin for more.
    [HttpPost("{id:int}/refund")]
    public async Task<IActionResult> Refund(int id, [FromBody] RefundRequest request)
    {
        var tx = await _context.PaymentTransactions.Include(p => p.Invoice).FirstOrDefaultAsync(p => p.Id == id);
        if (tx == null) return NotFound();
        if (tx.Status != "paid") return BadRequest(new { message = "Only paid transactions can be refunded" });

        var amount = request.Amount ?? tx.Amount;
        if (amount <= 0 || amount > tx.Amount) return BadRequest(new { message = "Invalid refund amount" });

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("GymOwner");
        var settings = await _context.GymSettings.OrderBy(s => s.Id).FirstOrDefaultAsync();
        var threshold = settings?.RefundThreshold ?? 50m;
        if (!isAdmin && amount > threshold)
            return StatusCode(403, new { message = $"Refunds above {threshold:0.00} EUR require admin approval", needsAdmin = true, threshold });

        var refund = new PaymentTransaction
        {
            InvoiceId = tx.InvoiceId,
            ClientId = tx.ClientId,
            StaffId = CurrentUserId(),
            Amount = -amount,
            Currency = tx.Currency,
            Method = tx.Method,
            Status = "refunded",
            Provider = tx.Provider,
            ProviderReference = tx.ProviderReference,
            ReceiptNumber = $"RF-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}"
        };
        _context.PaymentTransactions.Add(refund);

        var fullRefund = amount >= tx.Amount;
        if (fullRefund) tx.Status = "refunded";
        tx.UpdatedAt = DateTime.UtcNow;
        if (fullRefund && tx.Invoice != null)
        {
            tx.Invoice.Status = "refunded";
            tx.Invoice.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(new { refundId = refund.Id, refunded = amount, fullRefund, original = tx.Id });
    }

    [HttpGet("{id:int}/receipt")]
    public async Task<IActionResult> Receipt(int id)
    {
        var tx = await _context.PaymentTransactions.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        if (tx == null) return NotFound();
        return Content(tx.ReceiptHtml ?? BuildReceiptHtml(tx, null), "text/html");
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        var rows = await _context.PaymentTransactions.AsNoTracking()
            .OrderByDescending(p => p.CreatedAt)
            .Skip((Math.Max(1, page) - 1) * Math.Clamp(pageSize, 1, 100))
            .Take(Math.Clamp(pageSize, 1, 100))
            .Select(p => new
            {
                p.Id,
                p.InvoiceId,
                p.ClientId,
                p.Amount,
                p.Currency,
                p.Method,
                p.Status,
                p.Provider,
                p.ProviderReference,
                p.ReceiptNumber,
                p.CreatedAt
            })
            .ToListAsync();
        return Ok(rows);
    }

    private static object Shape(PaymentTransaction tx, string? checkoutUrl = null) => new
    {
        tx.Id,
        tx.InvoiceId,
        tx.ClientId,
        tx.Amount,
        tx.Currency,
        tx.Method,
        tx.Status,
        tx.Provider,
        tx.ProviderReference,
        tx.ReceiptNumber,
        tx.CreatedAt,
        checkoutUrl = checkoutUrl,
        receiptUrl = $"/api/payments/{tx.Id}/receipt"
    };

    private static string BuildReceiptHtml(PaymentTransaction tx, Invoice? invoice)
    {
        var client = invoice?.Client?.User?.Name ?? "Klient";
        return $"""
        <!doctype html>
        <html lang="sq">
        <head><meta charset="utf-8"><title>{tx.ReceiptNumber}</title></head>
        <body style="font-family:Arial,sans-serif;color:#16130F;padding:24px">
          <h1 style="margin:0 0 8px">Stand Up CrossFit</h1>
          <p style="margin:0 0 24px;color:#6E665C">Kuponi: {tx.ReceiptNumber}</p>
          <hr>
          <p><strong>Klienti:</strong> {client}</p>
          <p><strong>Metoda:</strong> {tx.Method}</p>
          <p><strong>Statusi:</strong> {tx.Status}</p>
          <p><strong>Totali:</strong> {tx.Amount:0.00} {tx.Currency}</p>
          <p><strong>Data:</strong> {tx.CreatedAt:dd.MM.yyyy HH:mm}</p>
        </body>
        </html>
        """;
    }
}

public class CheckoutRequest
{
    public int? InvoiceId { get; set; }
    public int? ClientId { get; set; }
    [Range(0.01, 1_000_000)] public decimal? Amount { get; set; }
    [Required, MaxLength(30)] public string Method { get; set; } = "cash";
    [MaxLength(60)] public string? Provider { get; set; }
    [MaxLength(120)] public string? IdempotencyKey { get; set; }
}

public class ConfirmPaymentRequest
{
    public bool Success { get; set; } = true;
    [MaxLength(120)] public string? ProviderReference { get; set; }
}

public class RefundRequest
{
    [Range(0.01, 1_000_000)] public decimal? Amount { get; set; }
    [MaxLength(200)] public string? Reason { get; set; }
}
