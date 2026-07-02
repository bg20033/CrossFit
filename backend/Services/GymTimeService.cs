namespace StandUpFitness.Services;

/// <summary>
/// Gym wall-clock time. Schedule slots (group hours, check-in windows, "today")
/// are configured in the gym's local time, while every timestamp we persist is
/// UTC. This service is the single place that converts between the two, so the
/// behavior doesn't change when the API is deployed on a UTC server (Fly.io).
/// Configure with Gym:TimeZone (IANA id, e.g. "Europe/Tirane").
/// </summary>
public interface IGymTimeService
{
    TimeZoneInfo TimeZone { get; }
    /// <summary>Current time in the gym's timezone (Kind = Unspecified).</summary>
    DateTime LocalNow { get; }
    /// <summary>Converts a UTC instant to gym wall-clock time.</summary>
    DateTime ToLocal(DateTime utc);
    /// <summary>UTC range [start, end) covering one gym-local calendar day.</summary>
    (DateTime StartUtc, DateTime EndUtc) LocalDayUtcRange(DateTime? localDate = null);
}

public class GymTimeService : IGymTimeService
{
    public GymTimeService(IConfiguration configuration)
    {
        TimeZone = ResolveTimeZone(configuration["Gym:TimeZone"] ?? "Europe/Tirane");
    }

    private static TimeZoneInfo ResolveTimeZone(string id)
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
        catch (TimeZoneNotFoundException) { }
        catch (InvalidTimeZoneException) { }

        // Windows fallback for the default IANA id, then the machine's own zone.
        try { return TimeZoneInfo.FindSystemTimeZoneById("Central European Standard Time"); }
        catch { return TimeZoneInfo.Local; }
    }

    public TimeZoneInfo TimeZone { get; }

    public DateTime LocalNow => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZone);

    public DateTime ToLocal(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), TimeZone);

    public (DateTime StartUtc, DateTime EndUtc) LocalDayUtcRange(DateTime? localDate = null)
    {
        var day = (localDate ?? LocalNow).Date;
        var startUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(day, DateTimeKind.Unspecified), TimeZone);
        return (startUtc, startUtc.AddDays(1));
    }
}
