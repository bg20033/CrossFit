using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "ReportsRead")]
public class ReportsController : ControllerBase
{
    private readonly FitnessContext _context;

    public ReportsController(FitnessContext context)
    {
        _context = context;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> Overview([FromQuery] int rangeDays = 30)
    {
        rangeDays = Math.Clamp(rangeDays, 7, 365);
        var now = DateTime.UtcNow;
        var from = now.AddDays(-rangeDays);

        var finances = await _context.Finances
            .Where(f => f.TransactionDate >= from && f.TransactionDate <= now)
            .Include(f => f.Category)
            .ToListAsync();
        var rentalInvoices = await _context.RentalInvoices
            .Where(i => i.Status == "paid" && i.PaidAt != null && i.PaidAt >= from && i.PaidAt <= now)
            .ToListAsync();
        var attendanceLogs = await _context.AttendanceLogs
            .Where(a => a.CheckInTime >= from && a.CheckInTime <= now)
            .ToListAsync();
        // Projection instead of loading full Client+User entities — this report
        // pulled every column of every client (incl. deleted) into memory.
        var clients = await _context.Clients
            .IgnoreQueryFilters()
            .Select(c => new
            {
                c.IsDeleted,
                c.IsActive,
                c.CreatedAt,
                c.MembershipExpiry,
                c.MembershipType,
                Name = c.User.Name
            })
            .ToListAsync();
        var groups = await _context.TrainingGroups
            .Include(g => g.Clients)
            .OrderBy(g => g.ScheduleStart)
            .Select(g => new
            {
                g.Name,
                Capacity = g.MaxCapacity,
                Booked = g.Clients.Count,
                Waitlist = _context.GroupWaitlistEntries.Count(w => w.TrainingGroupId == g.Id && w.Status == "waiting")
            })
            .ToListAsync();

        var membershipIncome = finances
            .Where(f => f.Type == "income")
            .Sum(f => f.Amount);
        var rentalIncome = rentalInvoices.Sum(i => i.Amount);

        var monthBuckets = MonthBuckets(from, now);
        var monthly = monthBuckets.Select(b => new
        {
            label = b.Label,
            membership = finances
                .Where(f => f.Type == "income" && f.TransactionDate >= b.Start && f.TransactionDate < b.End)
                .Sum(f => f.Amount),
            rental = rentalInvoices
                .Where(i => i.PaidAt >= b.Start && i.PaidAt < b.End)
                .Sum(i => i.Amount)
        });

        var paymentMethods = finances
            .Where(f => f.Type == "income")
            .GroupBy(f => string.IsNullOrWhiteSpace(f.PaymentMethod) ? "Tjetër" : f.PaymentMethod)
            .Select(g => new { label = g.Key, value = g.Sum(f => f.Amount) })
            .OrderByDescending(x => x.value)
            .ToList();
        if (paymentMethods.Count == 0)
            paymentMethods.Add(new { label = "Pa të dhëna", value = 0m });

        var byDate = attendanceLogs
            .GroupBy(a => a.CheckInTime.Date)
            // Order chronologically by the date itself — sorting the "dd/MM"
            // label put 01/07 before 15/06 whenever the range crossed months.
            .OrderBy(g => g.Key)
            .Select(g => new { label = g.Key.ToString("dd/MM"), value = g.Count() })
            .ToList();
        var trends = byDate.Count > 0 ? byDate : LastWeekLabels().Select(l => new { label = l, value = 0 }).ToList();

        var peakHours = attendanceLogs
            .GroupBy(a => a.CheckInTime.Hour)
            .Select(g => new { label = $"{g.Key:00}:00", value = g.Count() })
            .OrderBy(x => x.label)
            .ToList();
        if (peakHours.Count == 0)
            peakHours = Enumerable.Range(6, 15).Select(h => new { label = $"{h:00}:00", value = 0 }).ToList();

        var weekdays = new[] { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" };
        var weekday = weekdays
            .Select(wd => new { label = wd, value = attendanceLogs.Count(a => a.CheckInTime.DayOfWeek.ToString() == wd) })
            .ToList();

        var totalClients = clients.Count(c => !c.IsDeleted);
        var activeClients = clients.Count(c => !c.IsDeleted && c.IsActive);
        var churned = clients.Count(c => c.IsDeleted || !c.IsActive);
        var expiring = clients
            .Where(c => !c.IsDeleted && c.MembershipExpiry.HasValue)
            .Select(c => new
            {
                c.Name,
                plan = c.MembershipType,
                days = (int)Math.Ceiling((c.MembershipExpiry!.Value.Date - now.Date).TotalDays)
            })
            .Where(c => c.days >= 0 && c.days <= 90)
            .OrderBy(c => c.days)
            .ToList();

        var totalCapacity = groups.Sum(g => g.Capacity);
        var totalBooked = groups.Sum(g => g.Booked);
        var exp30 = expiring.Count(c => c.days <= 30);
        var renewals = finances.Count(f => f.Type == "income" && f.TransactionDate >= from);

        return Ok(new
        {
            revenue = new
            {
                totalMembership = membershipIncome,
                totalRental = rentalIncome,
                monthly,
                paymentMethods
            },
            attendance = new
            {
                trends,
                peakHours,
                weekday,
                trainers = new[] { new { label = "Të gjithë", value = attendanceLogs.Count } }
            },
            retention = new
            {
                totalClients,
                activeClients,
                churned,
                newClients = clients.Count(c => c.CreatedAt >= from && !c.IsDeleted),
                returning = attendanceLogs.Select(a => a.ClientId).Distinct().Count(),
                retentionRate = totalClients > 0 ? Math.Round((decimal)activeClients / totalClients * 100) : 0,
                churnRate = totalClients > 0 ? Math.Round((decimal)churned / totalClients * 100) : 0,
                cohorts = Enumerable.Range(1, 12).Select(i => new { label = $"Muaj {i}", value = activeClients > 0 ? Math.Max(0, 100 - (i - 1) * 5) : 0 })
            },
            groups = new
            {
                groups = groups.Select(g => new { name = g.Name, capacity = g.Capacity, booked = g.Booked, waitlist = g.Waitlist }),
                totalCapacity,
                totalBooked,
                avgOccupancy = totalCapacity > 0 ? Math.Round((decimal)totalBooked / totalCapacity * 100) : 0,
                totalWaitlist = groups.Sum(g => g.Waitlist)
            },
            expirations = new
            {
                exp7 = expiring.Count(c => c.days <= 7),
                exp30,
                exp90 = expiring.Count,
                renewals,
                conversionRate = exp30 > 0 ? Math.Round((decimal)renewals / exp30 * 100) : 0,
                expiringList = expiring.Take(10)
            }
        });
    }

    private static IEnumerable<(string Label, DateTime Start, DateTime End)> MonthBuckets(DateTime from, DateTime now)
    {
        var start = new DateTime(from.Year, from.Month, 1);
        var monthNames = new[] { "Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Korr", "Gush", "Sht", "Tet", "Nen", "Dhj" };
        while (start <= now)
        {
            var end = start.AddMonths(1);
            yield return (monthNames[start.Month - 1], start, end);
            start = end;
        }
    }

    private static string[] LastWeekLabels() => new[] { "Hen", "Mar", "Mer", "Enj", "Pre", "Sht", "Die" };
}
