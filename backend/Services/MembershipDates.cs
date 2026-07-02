namespace StandUpFitness.Services;

/// <summary>
/// Rregulli i vetëm i rinovimit (përdoret nga InvoicePaymentService dhe
/// MembershipsController — më parë secili kishte kopjen e vet):
///   • Rinovim para skadimit  → periudha e re NIS te skadimi (stack).
///   • Skaduar ≤ 7 ditë (grace) → periudha e re NIS te data e skadimit,
///     jo sot — ditët e humbura i "paguan" klienti, jo palestra.
///   • Skaduar > 7 ditë → fillim i freskët nga sot.
/// </summary>
public static class MembershipDates
{
    public const int GraceDays = 7;

    public static DateTime RenewalBase(DateTime? expiry, DateTime nowUtc)
    {
        if (!expiry.HasValue) return nowUtc;
        if (expiry.Value > nowUtc) return expiry.Value;                     // ende aktive → shto në fund
        if (expiry.Value >= nowUtc.AddDays(-GraceDays)) return expiry.Value; // brenda grace → numëro nga skadimi
        return nowUtc;                                                       // e kaluar prej kohësh → nga sot
    }
}
