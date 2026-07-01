using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/memberships")]
[Authorize]
public class MembershipsController : ControllerBase
{
    private readonly FitnessContext _context;

    public MembershipsController(FitnessContext context)
    {
        _context = context;
    }

    [HttpGet("current")]
    public async Task<IActionResult> Current([FromQuery] int? clientId)
    {
        var client = await ResolveClientAsync(clientId);
        if (client == null) return NotFound();
        if (!await CanAccessClientAsync(client.Id)) return Forbid();

        return Ok(await ShapeCurrentAsync(client));
    }

    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery] int? clientId)
    {
        var client = await ResolveClientAsync(clientId);
        if (client == null) return NotFound();
        if (!await CanAccessClientAsync(client.Id)) return Forbid();

        var invoices = await _context.Invoices
            .Where(i => i.ClientId == client.Id)
            .OrderByDescending(i => i.CreatedAt)
            .Take(24)
            .Select(i => new
            {
                i.Id,
                Name = i.Description,
                StartDate = i.CreatedAt,
                ExpiryDate = i.DueDate,
                Status = i.Status == "paid" ? "completed" : i.Status,
                Price = i.TotalAmount
            })
            .ToListAsync();

        if (invoices.Count > 0) return Ok(invoices);

        var current = await ShapeCurrentAsync(client);
        return Ok(new[] { current });
    }

    [HttpGet("offers")]
    public async Task<IActionResult> Offers()
    {
        var plans = await _context.MembershipPlans
            .Where(p => p.IsActive)
            .OrderBy(p => p.Price)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Description,
                p.Price,
                OriginalPrice = (decimal?)null,
                DiscountLabel = p.PlanType == "police" ? "Zbritje për policë" :
                    p.PlanType == "shared" ? "Paketë e përbashkët" : null,
                Highlight = p.PlanType == "yearly" || p.DurationDays >= 330,
                Shared = p.MaxSharedMembers > 1 || p.PlanType == "shared",
                PoliceDiscount = p.PlanType == "police",
                Type = p.PlanType,
                p.DurationDays,
                p.SessionsTotal
            })
            .ToListAsync();

        return Ok(plans);
    }

    [HttpPost("{clientId:int}/auto-renew")]
    public async Task<IActionResult> AutoRenew(int clientId, [FromBody] AutoRenewRequest request)
    {
        if (!await CanAccessClientAsync(clientId)) return Forbid();

        // There is no persisted auto-renew column yet; keep the API contract live so
        // the client UI can be wired without inventing schema churn in this pass.
        return Ok(new { clientId, autoRenew = request.AutoRenew });
    }

    [HttpPost("renew")]
    public async Task<IActionResult> Renew([FromBody] RenewRequest request)
    {
        var client = await ResolveClientAsync(request.ClientId ?? request.CurrentId);
        if (client == null) return NotFound();
        if (!await CanAccessClientAsync(client.Id)) return Forbid();

        var plan = client.Plan ?? await _context.MembershipPlans.FirstOrDefaultAsync(p => p.Name == client.MembershipType);
        var durationDays = plan?.DurationDays > 0 ? plan.DurationDays : 30;
        var baseDate = client.MembershipExpiry.HasValue && client.MembershipExpiry.Value > DateTime.UtcNow
            ? client.MembershipExpiry.Value
            : DateTime.UtcNow;

        client.MembershipExpiry = baseDate.AddDays(durationDays);
        client.IsActive = true;
        client.UpdatedAt = DateTime.UtcNow;

        if (plan != null && plan.Price > 0)
            _context.Invoices.Add(CreateMembershipInvoice(client.Id, plan));

        await _context.SaveChangesAsync();
        return Ok(await ShapeCurrentAsync(client));
    }

    [HttpPost("upgrade")]
    public async Task<IActionResult> Upgrade([FromBody] UpgradeRequest request)
    {
        var client = await ResolveClientAsync(request.ClientId);
        if (client == null) return NotFound();
        if (!await CanAccessClientAsync(client.Id)) return Forbid();

        var plan = await _context.MembershipPlans.FindAsync(request.OfferId);
        if (plan == null || !plan.IsActive) return BadRequest(new { message = "Membership plan not found" });

        client.PlanId = plan.Id;
        client.Plan = plan;
        client.MembershipType = plan.Name;
        client.MembershipExpiry = DateTime.UtcNow.AddDays(plan.DurationDays);
        client.IsActive = true;
        client.UpdatedAt = DateTime.UtcNow;

        if (plan.Price > 0)
            _context.Invoices.Add(CreateMembershipInvoice(client.Id, plan));

        await _context.SaveChangesAsync();
        return Ok(await ShapeCurrentAsync(client));
    }

    private async Task<Client?> ResolveClientAsync(int? clientId)
    {
        if (clientId.HasValue)
        {
            return await _context.Clients
                .Include(c => c.Plan)
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.Id == clientId.Value);
        }

        var userId = CurrentUserId();
        if (userId == null) return null;

        return await _context.Clients
            .Include(c => c.Plan)
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.UserId == userId.Value);
    }

    private async Task<object> ShapeCurrentAsync(Client client)
    {
        var plan = client.Plan ?? await _context.MembershipPlans.FirstOrDefaultAsync(p => p.Name == client.MembershipType);
        var expiry = client.MembershipExpiry ?? client.StartDate.AddDays(plan?.DurationDays > 0 ? plan.DurationDays : 30);
        var sessionsUsed = await _context.AttendanceLogs.CountAsync(a => a.ClientId == client.Id && a.CheckInTime >= client.StartDate);
        var status = client.IsActive && expiry >= DateTime.UtcNow ? "active" : "expired";

        return new
        {
            client.Id,
            Name = client.MembershipType,
            Status = status,
            StartDate = client.StartDate,
            ExpiryDate = expiry,
            Price = plan?.Price ?? 0,
            SessionsUsed = sessionsUsed,
            SessionsTotal = plan?.SessionsTotal ?? 0,
            AutoRenew = false,
            Type = plan?.PlanType ?? "standard",
            Shared = (plan?.MaxSharedMembers ?? 1) > 1,
            SharedClients = plan?.MaxSharedMembers
        };
    }

    private Invoice CreateMembershipInvoice(int clientId, MembershipPlan plan)
    {
        var invoice = new Invoice
        {
            InvoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(1000, 9999)}",
            ClientId = clientId,
            Description = $"{plan.Name} membership",
            Subtotal = plan.Price,
            TaxAmount = 0,
            TotalAmount = plan.Price,
            Status = "pending",
            DueDate = DateTime.UtcNow.AddDays(7),
            PaymentMethod = "cash"
        };

        invoice.Items.Add(new InvoiceItem
        {
            Description = $"{plan.Name} membership",
            Quantity = 1,
            UnitPrice = plan.Price,
            Total = plan.Price
        });

        return invoice;
    }

    private async Task<bool> CanAccessClientAsync(int clientId)
    {
        if (User.IsInRole("Admin") || User.IsInRole("GymOwner") || User.IsInRole("Staff") || User.IsInRole("Cashier"))
            return true;

        var userId = CurrentUserId();
        if (userId == null) return false;

        if (User.IsInRole("Client"))
            return await _context.Clients.AnyAsync(c => c.Id == clientId && c.UserId == userId.Value);

        if (User.IsInRole("Trainer"))
            return await _context.Clients.AnyAsync(c => c.Id == clientId && c.Trainer != null && c.Trainer.UserId == userId.Value);

        return false;
    }

    private int? CurrentUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        return int.TryParse(claim?.Value, out var id) ? id : null;
    }
}

public class AutoRenewRequest
{
    public bool AutoRenew { get; set; }
}

public class RenewRequest
{
    public int? CurrentId { get; set; }
    public int? ClientId { get; set; }
}

public class UpgradeRequest
{
    public int OfferId { get; set; }
    public int? ClientId { get; set; }
}
