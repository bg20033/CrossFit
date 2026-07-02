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
    private readonly IInvoicePaymentService _invoicePayments;
    private readonly IFinanceService _finance;
    private readonly IInventoryService _inventory;

    public PaymentsController(FitnessContext context, IPaymentGatewayService gateway,
        IInvoicePaymentService invoicePayments, IFinanceService finance, IInventoryService inventory)
    {
        _context = context;
        _gateway = gateway;
        _invoicePayments = invoicePayments;
        _finance = finance;
        _inventory = inventory;
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
        if (invoice != null && invoice.Status is "cancelled" or "refunded")
            return BadRequest(new { message = $"Fatura është {invoice.Status} dhe nuk mund të paguhet." });

        var receiptNumber = DocumentNumbers.Receipt();
        var gateway = await _gateway.CreateAsync(request.Method, amount.Value, "EUR", receiptNumber);
        if (gateway.Status == "unconfigured")
            return BadRequest(new { message = "Pagesat online nuk janë konfiguruar. Përdor cash, card ose transfer, ose vendos Payments:Provider." });

        var tx = new PaymentTransaction
        {
            InvoiceId = invoice?.Id,
            ClientId = request.ClientId ?? invoice?.ClientId,
            StaffId = User.CurrentUserId(),
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

        if (tx.Status == "paid")
            await ApplyPaidEffectsAsync(tx, invoice);

        await _context.SaveChangesAsync();
        return Ok(Shape(tx, gateway.CheckoutUrl));
    }

    // Books the money for a settled transaction. With an invoice this runs the
    // full pipeline (finance income + membership activation + group auto-enroll);
    // without one (ad-hoc desk sale) it still records the income — previously
    // these payments never reached Finance at all, so reports understated revenue.
    private async Task ApplyPaidEffectsAsync(PaymentTransaction tx, Invoice? invoice)
    {
        if (invoice != null)
        {
            await _invoicePayments.MarkPaidAsync(invoice, tx.Method, User.CurrentUserId());
        }
        else
        {
            await _finance.RecordIncomeAsync(
                FinanceService.MemberPayments,
                tx.Amount,
                $"Pagesë në arkë — kuponi {tx.ReceiptNumber}",
                tx.Method,
                User.CurrentUserId());
        }
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

        if (request.Success)
            await ApplyPaidEffectsAsync(tx, tx.Invoice);

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
            StaffId = User.CurrentUserId(),
            Amount = -amount,
            Currency = tx.Currency,
            Method = tx.Method,
            Status = "refunded",
            Provider = tx.Provider,
            ProviderReference = tx.ProviderReference,
            ReceiptNumber = DocumentNumbers.Refund()
        };
        _context.PaymentTransactions.Add(refund);

        // Refunds must show up in Finance too — otherwise reports overstate income.
        await _finance.RecordExpenseAsync(
            FinanceService.Refunds,
            amount,
            $"Rimbursim — kuponi {tx.ReceiptNumber ?? tx.Id.ToString()}{(string.IsNullOrWhiteSpace(request.Reason) ? "" : $" ({request.Reason})")}",
            tx.Method,
            User.CurrentUserId());

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

    // POST: api/payments/pos-checkout
    // Cash-register product sale: creates a paid invoice, books the income,
    // records the payment transaction, and decrements stock atomically.
    [HttpPost("pos-checkout")]
    public async Task<IActionResult> PosCheckout([FromBody] PosCheckoutRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
        {
            var existing = await _context.PaymentTransactions
                .FirstOrDefaultAsync(p => p.IdempotencyKey == request.IdempotencyKey);
            if (existing != null) return Ok(Shape(existing));
        }

        if (request.Items == null || request.Items.Count == 0)
            return BadRequest(new { message = "Cart is empty" });

        var clientExists = await _context.Clients.AnyAsync(c => c.Id == request.ClientId);
        if (!clientExists) return BadRequest(new { message = "Client not found" });

        var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await _context.Products
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        var invoice = new Invoice
        {
            InvoiceNumber = DocumentNumbers.Invoice(),
            ClientId = request.ClientId,
            StaffId = User.CurrentUserId(),
            Description = "Shitje në arkë",
            PaymentMethod = request.Method,
            Status = "pending",
            DueDate = DateTime.UtcNow,
            CashRegisterId = IsCashLike(request.Method) ? await _finance.FindOpenCashRegisterIdAsync() : null
        };

        foreach (var item in request.Items)
        {
            if (!products.TryGetValue(item.ProductId, out var product))
                return BadRequest(new { message = $"Product {item.ProductId} not found" });
            if (item.Quantity <= 0)
                return BadRequest(new { message = $"Invalid quantity for {product.Name}" });

            invoice.Items.Add(new InvoiceItem
            {
                Description = product.Name,
                Quantity = item.Quantity,
                UnitPrice = product.SalePrice,
                Total = item.Quantity * product.SalePrice,
                ProductId = product.Id
            });
        }

        invoice.Subtotal = invoice.Items.Sum(i => i.Total);
        invoice.TaxAmount = 0;
        invoice.TotalAmount = invoice.Subtotal;

        _context.Invoices.Add(invoice);

        var receiptNumber = DocumentNumbers.Receipt();
        var tx = new PaymentTransaction
        {
            Invoice = invoice,
            ClientId = request.ClientId,
            StaffId = User.CurrentUserId(),
            Amount = invoice.TotalAmount,
            Currency = "EUR",
            Method = request.Method,
            Status = "paid",
            Provider = "manual",
            ReceiptNumber = receiptNumber,
            IdempotencyKey = request.IdempotencyKey
        };
        tx.ReceiptHtml = BuildReceiptHtml(tx, invoice);
        _context.PaymentTransactions.Add(tx);

        var (applied, error) = await _invoicePayments.MarkPaidAsync(invoice, request.Method, User.CurrentUserId());
        if (error != null) return BadRequest(new { message = error });

        try
        {
            await _inventory.RemoveStockForSaleAsync(invoice.Items, User.CurrentUserId());
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }

        await _context.SaveChangesAsync();

        return Ok(Shape(tx));
    }

    private static bool IsCashLike(string method) =>
        string.Equals(method, "cash", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(method, "pos", StringComparison.OrdinalIgnoreCase);

    private static string BuildReceiptHtml(PaymentTransaction tx, Invoice? invoice)
    {
        var client = invoice?.Client?.User?.Name ?? (invoice?.ClientId > 0 ? $"Klient #{invoice.ClientId}" : "Klient");
        var itemsHtml = "";
        if (invoice?.Items is { Count: > 0 } items)
        {
            var rows = string.Join("\n", items.Select(i =>
                $"<tr><td>{i.Description}</td><td style='text-align:center'>{i.Quantity}</td><td style='text-align:right'>{i.UnitPrice:0.00}</td><td style='text-align:right'>{i.Total:0.00}</td></tr>"));
            itemsHtml = $"""
            <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
              <thead><tr style="border-bottom:1px solid #ddd"><th style="text-align:left">Artikulli</th><th>Sasia</th><th style="text-align:right">Çmimi</th><th style="text-align:right">Totali</th></tr></thead>
              <tbody>{rows}</tbody>
            </table>
            """;
        }

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
          {itemsHtml}
          <p style="font-size:18px;font-weight:bold;margin-top:16px">Totali: {tx.Amount:0.00} {tx.Currency}</p>
          <p><strong>Data:</strong> {tx.CreatedAt:dd.MM.yyyy HH:mm}</p>
        </body>
        </html>
        """;
    }
}

public class PosCheckoutRequest
{
    [Required] public int ClientId { get; set; }
    [Required, MaxLength(30)] public string Method { get; set; } = "cash";
    public List<PosCheckoutItem> Items { get; set; } = new();
    [MaxLength(120)] public string? IdempotencyKey { get; set; }
}

public class PosCheckoutItem
{
    public int ProductId { get; set; }
    [Range(1, int.MaxValue)] public int Quantity { get; set; }
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
