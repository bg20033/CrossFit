using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;
using StandUpFitness.Services;

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

    private async Task<decimal> ResolveDiscountedPriceAsync(Client client, MembershipPlan plan)
    {
        var discount = await _context.DiscountCategories
            .FirstOrDefaultAsync(d => d.Key == client.DiscountCategory && d.IsActive);
        var percent = discount?.DiscountPercent ?? 0m;
        return plan.Price * (1 - percent / 100m);
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

    // Renewal used to extend the membership IMMEDIATELY and only then create a
    // pending invoice — so a client could extend their own package for free from
    // the app (revenue leak), and marking that invoice paid later would extend it
    // AGAIN. Now both renew and upgrade only create a pending membership invoice;
    // the extension/switch is applied exactly once by InvoicePaymentService when
    // the invoice is actually paid (mark-paid or a desk checkout). Zero-price
    // plans have nothing to pay, so they still apply instantly.
    [HttpPost("renew")]
    public async Task<IActionResult> Renew([FromBody] RenewRequest request)
    {
        var client = await ResolveClientAsync(request.ClientId ?? request.CurrentId);
        if (client == null) return NotFound();
        if (!await CanAccessClientAsync(client.Id)) return Forbid();

        var plan = await ResolvePlanAsync(client);
        if (plan == null || plan.Price <= 0)
        {
            ApplyPlanNow(client, plan);
            await _context.SaveChangesAsync();
            return Ok(await ShapeCurrentAsync(client));
        }

        var discountedPrice = await ResolveDiscountedPriceAsync(client, plan);
        if (discountedPrice <= 0)
        {
            ApplyPlanNow(client, plan);
            await _context.SaveChangesAsync();
            return Ok(await ShapeCurrentAsync(client));
        }

        var invoice = await GetOrCreatePendingMembershipInvoiceAsync(client.Id, plan, discountedPrice);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            current = await ShapeCurrentAsync(client),
            pendingInvoiceId = invoice.Id,
            pendingInvoiceNumber = invoice.InvoiceNumber,
            amountDue = invoice.TotalAmount,
            message = "Fatura u krijua — pakoja aktivizohet pas pagesës në recepsion."
        });
    }

    [HttpPost("upgrade")]
    public async Task<IActionResult> Upgrade([FromBody] UpgradeRequest request)
    {
        var client = await ResolveClientAsync(request.ClientId);
        if (client == null) return NotFound();
        if (!await CanAccessClientAsync(client.Id)) return Forbid();

        var plan = await _context.MembershipPlans.FindAsync(request.OfferId);
        if (plan == null || !plan.IsActive) return BadRequest(new { message = "Membership plan not found" });

        if (plan.Price <= 0)
        {
            ApplyPlanNow(client, plan);
            await _context.SaveChangesAsync();
            return Ok(await ShapeCurrentAsync(client));
        }

        var discountedPrice = await ResolveDiscountedPriceAsync(client, plan);
        if (discountedPrice <= 0)
        {
            ApplyPlanNow(client, plan);
            await _context.SaveChangesAsync();
            return Ok(await ShapeCurrentAsync(client));
        }

        var invoice = await GetOrCreatePendingMembershipInvoiceAsync(client.Id, plan, discountedPrice);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            current = await ShapeCurrentAsync(client),
            pendingInvoiceId = invoice.Id,
            pendingInvoiceNumber = invoice.InvoiceNumber,
            amountDue = invoice.TotalAmount,
            message = "Fatura u krijua — pakoja e re aktivizohet pas pagesës në recepsion."
        });
    }

    private static void ApplyPlanNow(Client client, MembershipPlan? plan)
    {
        var durationDays = plan?.DurationDays > 0 ? plan.DurationDays : 30;
        // I njëjti rregull grace si InvoicePaymentService (shih MembershipDates).
        var baseDate = MembershipDates.RenewalBase(client.MembershipExpiry, DateTime.UtcNow);

        client.MembershipExpiry = baseDate.AddDays(durationDays);
        client.IsActive = true;
        if (plan != null)
        {
            client.PlanId = plan.Id;
            client.MembershipType = plan.Name;
        }
        client.UpdatedAt = DateTime.UtcNow;
    }

    // Dedupe: repeated renew clicks reuse the existing unpaid invoice for the
    // same plan instead of piling up pending invoices.
    private async Task<Invoice> GetOrCreatePendingMembershipInvoiceAsync(int clientId, MembershipPlan plan, decimal price)
    {
        var description = $"{plan.Name} membership";
        // Items duhen ngarkuar bashkë me faturën: pa Include, ndryshimi i çmimit
        // (p.sh. u korrigjua përqindja e zbritjes) përditësonte TotalAmount por
        // e linte artikullin me çmimin e vjetër (Items bosh → FirstOrDefault null).
        // Faturat me [membership-applied] (expiry u caktua me dorë në krijim)
        // NUK ripërdoren: pagesa e tyre s'e zgjat pakon, kështu që "rinovimi"
        // që binte mbi to nuk bënte asgjë — simptoma klasike e rinovimit të prishur.
        var existing = await _context.Invoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.ClientId == clientId && i.Status == "pending" && i.Description == description
                && (i.Notes == null || !i.Notes.Contains("[membership-applied]")));
        if (existing != null)
        {
            // Update amount if discount changed since the invoice was first created.
            if (existing.TotalAmount != price)
            {
                existing.Subtotal = price;
                existing.TotalAmount = price;
                var item = existing.Items.FirstOrDefault();
                if (item != null)
                {
                    item.UnitPrice = price;
                    item.Total = price;
                }
            }
            return existing;
        }

        var invoice = CreateMembershipInvoice(clientId, plan, price);
        _context.Invoices.Add(invoice);
        return invoice;
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

        var userId = User.CurrentUserId();
        if (userId == null) return null;

        return await _context.Clients
            .Include(c => c.Plan)
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.UserId == userId.Value);
    }

    // Resolves a client's plan for the purpose of reading its price/duration/session
    // count, even if the plan was later soft-deleted from the Pakot admin page.
    // MembershipPlan has a global HasQueryFilter(!IsDeleted), so a plain lookup (or
    // the client.Plan navigation loaded via .Include) silently returns null the
    // moment a plan is deleted — even for clients who are still actively on it. That
    // makes their price show €0 and sessions-remaining go negative (0 - used), which
    // is exactly the "package looks broken" symptom. IgnoreQueryFilters() here is
    // scoped to this read-only lookup only; Offers() below still correctly hides
    // deleted plans from being purchased/assigned again.
    private async Task<MembershipPlan?> ResolvePlanAsync(Client client)
    {
        if (client.PlanId.HasValue)
        {
            var byId = await _context.MembershipPlans.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Id == client.PlanId.Value);
            if (byId != null) return byId;
        }
        return await _context.MembershipPlans.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Name == client.MembershipType);
    }

    private async Task<object> ShapeCurrentAsync(Client client)
    {
        var plan = await ResolvePlanAsync(client);
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

    private Invoice CreateMembershipInvoice(int clientId, MembershipPlan plan, decimal price)
    {
        var invoice = new Invoice
        {
            InvoiceNumber = Services.DocumentNumbers.Invoice(),
            ClientId = clientId,
            Description = $"{plan.Name} membership",
            Subtotal = price,
            TaxAmount = 0,
            TotalAmount = price,
            Status = "pending",
            DueDate = DateTime.UtcNow.AddDays(7),
            PaymentMethod = "cash"
        };

        invoice.Items.Add(new InvoiceItem
        {
            Description = $"{plan.Name} membership",
            Quantity = 1,
            UnitPrice = price,
            Total = price
        });

        return invoice;
    }

    private async Task<bool> CanAccessClientAsync(int clientId)
        => await _context.CanAccessCoreClientAsync(
            User,
            clientId,
            includeStaff: true,
            includeCashier: true,
            includeTrainerGroupClients: false);
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
