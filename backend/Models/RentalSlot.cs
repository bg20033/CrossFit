namespace StandUpFitness.Models;

// DEPRECATED (2026-07-01): replaced by RentalScheduleSlot + RentalSession.
// Rentals no longer work as "book a slot out of a shared pool" — a qiragji
// (TrainerTenant) now configures their own name + recurring weekly schedule
// directly, the same way a TrainingGroup does. This class is kept only because
// this environment cannot run `dotnet ef migrations remove`/delete files; it is
// NOT registered in FitnessContext (no DbSet, no OnModelCreating config) and the
// backing "RentalSlots" table is dropped by migration 20260701120000_ReworkRentalScheduling.
// Safe to delete this file from your machine once you've pulled these changes.
public class RentalSlot
{
    public int Id { get; set; }
    public int? TrainerTenantId { get; set; }
    public string DayOfWeek { get; set; } = "Monday";
    public int StartMin { get; set; }
    public int DurationMin { get; set; } = 80;
    public string Room { get; set; } = "Main floor";
    public decimal Cost { get; set; }
    public string Status { get; set; } = "free"; // free | pending | booked | blocked
    public bool IsRecurring { get; set; } = true;
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public TrainerTenant? TrainerTenant { get; set; }
}
