namespace StandUpFitness.Models;

/// <summary>
/// Single-row gym configuration: operating hours, holiday closures, branding and
/// the cashier refund threshold. Seeded with id=1 on first run.
/// </summary>
public class GymSettings
{
    public int Id { get; set; }
    public string OpenTime { get; set; } = "06:00";
    public string CloseTime { get; set; } = "22:00";
    /// <summary>CSV of weekday numbers closed (0=Mon..6=Sun), e.g. "6" for Sunday.</summary>
    public string ClosedDays { get; set; } = "";
    /// <summary>CSV of ISO dates that are holiday closures, e.g. "2026-12-25,2027-01-01".</summary>
    public string HolidayDates { get; set; } = "";
    public string BrandName { get; set; } = "Stand Up CrossFit";
    public string BrandColor { get; set; } = "#EE3A24";
    /// <summary>Refunds at or below this amount can be done by a cashier; above needs admin.</summary>
    public decimal RefundThreshold { get; set; } = 50;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
