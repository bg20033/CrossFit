using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Services;

/// <summary>
/// The single code path for "this invoice got paid". Previously three places
/// handled payment with different (inconsistent) side effects:
///   • InvoiceController.MarkAsPaid → Finance income + group auto-enroll,
///   • PaymentsController checkout/confirm → invoice flipped to paid but NO
///     Finance row and NO group enroll (books never matched),
///   • re-marking a paid invoice duplicated the income row.
/// This service applies all effects exactly once, idempotently:
///   1. status guard (pending → paid only),
///   2. Finance income under "Member Payments" (linked to the open cash register),
///   3. membership activation/extension when the invoice is a membership invoice,
///   4. GAP-7: auto-enroll into any group referenced by invoice items (waitlist when full).
/// Changes are added to the context but NOT saved — the caller commits atomically.
/// </summary>
public interface IInvoicePaymentService
{
    /// <returns>(applied, error) — applied=false with null error means "already paid" (no-op).</returns>
    Task<(bool Applied, string? Error)> MarkPaidAsync(Invoice invoice, string? paymentMethod, int? userId);
}

public class InvoicePaymentService : IInvoicePaymentService
{
    private const string MembershipSuffix = " membership";
    private const string MembershipAppliedMarker = "[membership-applied]";

    private readonly FitnessContext _context;
    private readonly IFinanceService _finance;

    public InvoicePaymentService(FitnessContext context, IFinanceService finance)
    {
        _context = context;
        _finance = finance;
    }

    public async Task<(bool Applied, string? Error)> MarkPaidAsync(Invoice invoice, string? paymentMethod, int? userId)
    {
        if (invoice.Status == "paid")
            return (false, null); // idempotent: nothing to do, not an error
        if (invoice.Status is "cancelled" or "refunded")
            return (false, $"Fatura është {invoice.Status} dhe nuk mund të paguhet.");

        invoice.Status = "paid";
        invoice.PaidDate = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(paymentMethod))
            invoice.PaymentMethod = paymentMethod;
        invoice.UpdatedAt = DateTime.UtcNow;

        await _finance.RecordIncomeAsync(
            FinanceService.MemberPayments,
            invoice.TotalAmount,
            $"Payment for {invoice.InvoiceNumber}",
            invoice.PaymentMethod,
            userId);

        // Make sure items are loaded (checkout paths load the invoice without them).
        if (!_context.Entry(invoice).Collection(i => i.Items).IsLoaded)
            await _context.Entry(invoice).Collection(i => i.Items).LoadAsync();

        var client = await _context.Clients
            .Include(c => c.Groups)
            .FirstOrDefaultAsync(c => c.Id == invoice.ClientId);

        if (client != null)
        {
            ApplyMembership(invoice, client, await ResolveMembershipPlanAsync(invoice));
            await EnrollPaidGroupsAsync(invoice, client);
        }

        return (true, null);
    }

    /// <summary>
    /// Membership invoices carry "{plan name} membership" as their description
    /// (ClientsController, MembershipsController). Paying one activates/extends
    /// the membership — renewals now take effect at payment, not at request time,
    /// so a client can no longer extend their own package without paying.
    /// </summary>
    private async Task<MembershipPlan?> ResolveMembershipPlanAsync(Invoice invoice)
    {
        var planName = MembershipPlanName(invoice);
        if (planName == null) return null;
        // IgnoreQueryFilters: a client may still be on a soft-deleted plan.
        return await _context.MembershipPlans.IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Name == planName);
    }

    private static string? MembershipPlanName(Invoice invoice)
    {
        var description = invoice.Description ?? "";
        if (!description.EndsWith(MembershipSuffix, StringComparison.OrdinalIgnoreCase)) return null;
        var name = description[..^MembershipSuffix.Length].Trim();
        return name.Length > 0 ? name : null;
    }

    private void ApplyMembership(Invoice invoice, Client client, MembershipPlan? plan)
    {
        if (MembershipPlanName(invoice) == null) return;
        // Guard against double-extension (e.g. staff pre-set an expiry at client
        // creation, or the invoice is processed by both checkout and confirm).
        if (invoice.Notes?.Contains(MembershipAppliedMarker) == true) return;

        var durationDays = plan?.DurationDays > 0 ? plan.DurationDays : 30;
        // Grace 7-ditore: rinovimi brenda 7 ditësh pas skadimit numëron nga data
        // e skadimit (jo nga sot); më vonë fillon i freskët nga sot (MembershipDates).
        var baseDate = MembershipDates.RenewalBase(client.MembershipExpiry, DateTime.UtcNow);

        client.MembershipExpiry = baseDate.AddDays(durationDays);
        client.IsActive = true;
        if (plan != null)
        {
            client.PlanId = plan.Id;
            client.MembershipType = plan.Name;
        }
        client.UpdatedAt = DateTime.UtcNow;

        invoice.Notes = string.IsNullOrWhiteSpace(invoice.Notes)
            ? MembershipAppliedMarker
            : $"{invoice.Notes} {MembershipAppliedMarker}";
    }

    /// <summary>GAP-7: paying an invoice line tied to a group enrolls the client (or waitlists when full).</summary>
    private async Task EnrollPaidGroupsAsync(Invoice invoice, Client client)
    {
        var groupIds = invoice.Items
            .Where(it => it.GroupId.HasValue)
            .Select(it => it.GroupId!.Value)
            .Distinct()
            .ToList();
        if (groupIds.Count == 0) return;

        var groups = await _context.TrainingGroups
            .Include(g => g.Clients)
            .Where(g => groupIds.Contains(g.Id))
            .ToListAsync();

        foreach (var group in groups)
        {
            if (client.Groups.Any(x => x.Id == group.Id)) continue;

            if (group.Clients.Count >= group.MaxCapacity)
            {
                var waiting = await _context.GroupWaitlistEntries.AnyAsync(w =>
                    w.TrainingGroupId == group.Id && w.ClientId == client.Id && w.Status == "waiting");
                if (!waiting)
                    _context.GroupWaitlistEntries.Add(new GroupWaitlistEntry
                    {
                        TrainingGroupId = group.Id,
                        ClientId = client.Id
                    });
            }
            else
            {
                group.Clients.Add(client);
            }
        }
    }
}
