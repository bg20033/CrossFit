using Microsoft.AspNetCore.Authorization;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;
using StandUpFitness.Services;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // /me is open to any authenticated user; management actions tightened below
public class ClientsController : ControllerBase
{
    private readonly FitnessContext _context;

    public ClientsController(FitnessContext context)
    {
        _context = context;
    }

    private async Task<decimal> GetDiscountPercentAsync(string? key)
    {
        if (string.IsNullOrWhiteSpace(key))
            return 0;
        var discount = await _context.DiscountCategories
            .FirstOrDefaultAsync(d => d.Key == key.Trim() && d.IsActive);
        return discount?.DiscountPercent ?? 0m;
    }

    private async Task<string> NewQrTokenAsync()
    {
        string token;
        do
        {
            token = $"SUCF-{Guid.NewGuid():N}".ToUpperInvariant();
        }
        while (await _context.Clients.IgnoreQueryFilters().AnyAsync(c => c.QrToken == token));
        return token;
    }

    // GET: api/clients/me -> client profile for the logged-in user (auto-created on first access)
    [HttpGet("me")]
    public async Task<IActionResult> GetMyClientProfile()
    {
        var userId = User.CurrentUserId();
        if (userId == null)
            return Unauthorized();

        var client = await _context.Clients
            .Include(c => c.User)
            .Include(c => c.Trainer)
                .ThenInclude(t => t!.User)
            .Include(c => c.Groups)
            .FirstOrDefaultAsync(c => c.UserId == userId.Value);

        if (client == null)
        {
            var user = await _context.Users.FindAsync(userId.Value);
            if (user == null) return NotFound();
            if (user.Role != UserRole.Client) return Forbid();
            client = new Client
            {
                UserId = userId.Value,
                MembershipType = "standard",
                DiscountCategory = "standard",
                IsActive = true,
                QrToken = await NewQrTokenAsync()
            };
            _context.Clients.Add(client);
            await _context.SaveChangesAsync();
            await _context.Entry(client).Reference(c => c.User).LoadAsync();
        }
        else if (client.User.Role != UserRole.Client)
        {
            return Forbid();
        }
        else if (string.IsNullOrWhiteSpace(client.QrToken))
        {
            client.QrToken = await NewQrTokenAsync();
            client.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        var groupName = client.Groups
            .OrderBy(g => g.ScheduleStart)
            .Select(g => g.Name)
            .FirstOrDefault();

        return Ok(new
        {
            client.Id,
            client.UserId,
            client.User.Name,
            client.User.Email,
            client.MembershipType,
            client.DiscountCategory,
            client.MembershipExpiry,
            client.QrToken,
            client.IsActive,
            client.StartDate,
            TrainerName = client.Trainer?.User.Name,
            GroupName = groupName
        });
    }

    // GET: api/clients?page=1&pageSize=10&search=
    [Authorize(Policy = "AdminStaff")]
    [HttpGet]
    public async Task<IActionResult> GetClients(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null)
    {
        var query = _context.Clients
            .Include(c => c.User)
            .Include(c => c.Trainer)
            .AsQueryable();

        if (!string.IsNullOrEmpty(search))
            query = query.Where(c => c.User.Name.Contains(search) || c.User.Email.Contains(search));

        if (!string.IsNullOrEmpty(status))
            query = query.Where(c => c.IsActive == (status == "active"));

        var total = await query.CountAsync();
        var clients = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new
            {
                c.Id,
                UserId = c.User.Id,
                c.User.Name,
                c.User.Email,
                c.MembershipType,
                c.DiscountCategory,
                c.MembershipExpiry,
                c.QrToken,
                c.IsActive,
                Trainer = c.Trainer != null ? c.Trainer.User.Name : null,
                c.StartDate,
                c.CreatedAt
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, clients });
    }

    // GET: api/clients/{id}
    [Authorize(Policy = "AdminStaff")]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetClient(int id)
    {
        var client = await _context.Clients
            .AsNoTracking()
            .Include(c => c.User)
            .Include(c => c.Trainer).ThenInclude(t => t!.User)
            .Include(c => c.Goals)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (client == null)
            return NotFound();

        var attendance = await _context.AttendanceLogs
            .Where(al => al.ClientId == id && al.CheckOutTime != null)
            .CountAsync();

        return Ok(new
        {
            client.Id,
            client.User.Name,
            client.User.Email,
            client.User.Phone,
            client.MembershipType,
            client.DiscountCategory,
            client.PlanId,
            client.MembershipExpiry,
            client.QrToken,
            client.IsActive,
            client.TrainerId,
            Trainer = client.Trainer?.User.Name,
            client.StartDate,
            TotalCheckIns = attendance,
            Goals = client.Goals.Select(g => new { g.Id, g.Title, g.Status }),
            client.CreatedAt
        });
    }

    // POST: api/clients/create
    [Authorize(Policy = "AdminStaff")]
    [HttpPost("create")]
    public async Task<IActionResult> CreateClient([FromBody] CreateClientRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var name = request.Name.Trim();
        var membershipType = string.IsNullOrWhiteSpace(request.MembershipType) ? "standard" : request.MembershipType.Trim();
        var discountCategory = string.IsNullOrWhiteSpace(request.DiscountCategory) ? "standard" : request.DiscountCategory.Trim().ToLowerInvariant();
        var discountPercent = await GetDiscountPercentAsync(discountCategory);
        var userExists = await _context.Users.AnyAsync(u => u.Email == email);
        if (userExists)
            return BadRequest(new { message = "Email already exists" });
        if (request.MembershipExpiry.HasValue && request.MembershipExpiry.Value.Date < DateTime.UtcNow.Date)
            return BadRequest(new { message = "Membership expiry cannot be in the past" });

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var user = new User
        {
            Email = email,
            Name = name,
            PasswordHash = passwordHash,
            Role = UserRole.Client
        };

        var plan = await _context.MembershipPlans.FirstOrDefaultAsync(p => p.Name == membershipType);
        // Çmimi i dërguar nga recepsioni është çmimi FINAL (UI e ka aplikuar tashmë
        // zbritjen dhe stafi mund ta ketë ndryshuar me dorë — më parë injorohej në
        // heshtje sapo ekzistonte pakoja dhe faturohej çmimi i rillogaritur).
        // Pa çmim eksplicit: çmimi i pakos me zbritjen e kategorisë.
        var discountedPrice = request.MembershipPrice
            ?? (plan?.Price ?? 0m) * (1 - discountPercent / 100m);

        // With a priced membership the expiry is applied when the invoice is PAID
        // (InvoicePaymentService), not up front — otherwise paying the invoice later
        // would extend the package a second time. An explicitly requested expiry
        // still wins and suppresses the payment-time extension via the marker note.
        var invoiced = discountedPrice > 0;
        var client = new Client
        {
            User = user,
            MembershipType = membershipType,
            DiscountCategory = discountCategory,
            PlanId = plan?.Id,
            MembershipExpiry = request.MembershipExpiry ??
                (invoiced ? null : plan != null ? DateTime.UtcNow.AddDays(plan.DurationDays) : DateTime.UtcNow.AddMonths(1)),
            IsActive = true,
            QrToken = await NewQrTokenAsync()
        };

        _context.Users.Add(user);
        _context.Clients.Add(client);

        if (invoiced)
        {
            var invoice = new Invoice
            {
                InvoiceNumber = DocumentNumbers.Invoice(),
                Client = client,
                Description = $"{membershipType} membership",
                Subtotal = discountedPrice,
                TaxAmount = 0,
                TotalAmount = discountedPrice,
                Status = "pending",
                DueDate = DateTime.UtcNow,
                // Expiry chosen by staff at creation → payment must not extend again.
                Notes = request.MembershipExpiry.HasValue ? "[membership-applied]" : null
            };

            invoice.Items.Add(new InvoiceItem
            {
                Description = $"{membershipType} membership",
                Quantity = 1,
                UnitPrice = discountedPrice,
                Total = discountedPrice
            });

            _context.Invoices.Add(invoice);
        }

        // Single SaveChanges: user + client + invoice commit atomically (no more
        // half-created clients when the invoice insert failed).
        await _context.SaveChangesAsync();

        return Ok(new { message = "Client created successfully", id = client.Id, qrToken = client.QrToken });
    }

    // PUT: api/clients/{id}
    [Authorize(Policy = "AdminStaff")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateClient(int id, [FromBody] UpdateClientRequest request)
    {
        var client = await _context.Clients
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (client == null)
            return NotFound();

        if (!string.IsNullOrWhiteSpace(request.Name))
            client.User.Name = request.Name.Trim();

        // Email: ndryshohet vetëm nëse dërgohet; duhet të mbetet unik ndër userat.
        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var email = request.Email.Trim().ToLowerInvariant();
            if (email != client.User.Email)
            {
                if (await _context.Users.AnyAsync(u => u.Email == email && u.Id != client.UserId))
                    return BadRequest(new { message = "Ky email është i zënë nga një përdorues tjetër." });
                client.User.Email = email;
            }
        }

        // Telefoni: string bosh e pastron, null (i padërguar) e lë siç është.
        if (request.Phone != null)
            client.User.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();

        // Reset i fjalëkalimit nga admini/recepsioni (fjalëkalim i përkohshëm).
        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            if (request.NewPassword.Length < 8)
                return BadRequest(new { message = "Fjalëkalimi duhet të ketë të paktën 8 karaktere." });
            client.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        }

        if (!string.IsNullOrWhiteSpace(request.MembershipType))
        {
            var membershipType = request.MembershipType.Trim();
            client.MembershipType = membershipType;
            client.PlanId = (await _context.MembershipPlans.FirstOrDefaultAsync(p => p.Name == membershipType))?.Id;
        }
        if (!string.IsNullOrWhiteSpace(request.DiscountCategory))
            client.DiscountCategory = request.DiscountCategory.Trim().ToLowerInvariant();
        if (request.MembershipExpiry.HasValue && request.MembershipExpiry.Value.Date < DateTime.UtcNow.Date)
            return BadRequest(new { message = "Membership expiry cannot be in the past" });
        client.MembershipExpiry = request.MembershipExpiry ?? client.MembershipExpiry;
        client.IsActive = request.IsActive ?? client.IsActive;

        // TrainerId: 0 = hiqe trajnerin; vlerë tjetër = cakto; i padërguar = pa ndryshim.
        if (request.TrainerId.HasValue)
        {
            if (request.TrainerId.Value == 0)
            {
                client.TrainerId = null;
            }
            else
            {
                var trainer = await _context.Trainers.FindAsync(request.TrainerId);
                if (trainer == null) return BadRequest(new { message = "Trainer not found" });
                client.TrainerId = request.TrainerId;
            }
        }

        client.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Client updated successfully" });
    }

    // DELETE: api/clients/{id}
    [Authorize(Policy = "AdminStaff")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteClient(int id)
    {
        var client = await _context.Clients.FindAsync(id);
        if (client == null)
            return NotFound();

        client.IsDeleted = true;
        client.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Client deleted successfully" });
    }

    // GET: api/clients/{id}/attendance?month=6&year=2026
    [Authorize(Policy = "AdminStaff")]
    [HttpGet("{id}/attendance")]
    public async Task<IActionResult> GetClientAttendance(int id, [FromQuery] int? month, [FromQuery] int? year)
    {
        year ??= DateTime.UtcNow.Year;
        month ??= DateTime.UtcNow.Month;

        var startDate = new DateTime(year.Value, month.Value, 1);
        // Exclusive upper bound: "<= AddDays(-1)" cut off everything after
        // midnight on the last day of the month.
        var endDate = startDate.AddMonths(1);

        var rows = await _context.AttendanceLogs
            .Where(al => al.ClientId == id && al.CheckInTime >= startDate && al.CheckInTime < endDate)
            .OrderByDescending(al => al.CheckInTime)
            .Select(al => new { al.Id, al.CheckInTime, al.CheckOutTime })
            .ToListAsync();

        var attendance = rows.Select(al => new
        {
            al.Id,
            Date = al.CheckInTime.Date,
            CheckIn = al.CheckInTime.TimeOfDay,
            CheckOut = al.CheckOutTime.HasValue ? al.CheckOutTime.Value.TimeOfDay : (TimeSpan?)null,
            Duration = al.CheckOutTime.HasValue ? (al.CheckOutTime.Value - al.CheckInTime).TotalMinutes : (double?)null
        }).ToList();

        var totalDays = attendance.Select(a => a.Date).Distinct().Count();

        return Ok(new
        {
            month = $"{year}-{month:D2}",
            totalCheckIns = attendance.Count,
            totalDays = totalDays,
            attendance = attendance
        });
    }

    // POST: api/clients/{id}/check-in
    [Authorize(Policy = "AdminStaff")]
    [HttpPost("{id}/check-in")]
    public async Task<IActionResult> CheckInClient(int id)
    {
        var client = await _context.Clients.FindAsync(id);
        if (client == null)
            return NotFound();

        if (!client.IsActive)
            return BadRequest("Client membership is not active");

        if (client.MembershipExpiry.HasValue && client.MembershipExpiry.Value < DateTime.UtcNow)
            return BadRequest("Client membership has expired");

        // Double check-in guard: an open log would otherwise stack forever and
        // inflate the live in-gym count.
        var alreadyInside = await _context.AttendanceLogs
            .AnyAsync(al => al.ClientId == id && al.CheckOutTime == null && al.Decision == "granted");
        if (alreadyInside)
            return BadRequest(new { message = "Client is already checked in — check them out first" });

        var log = new AttendanceLog
        {
            ClientId = id,
            CheckInTime = DateTime.UtcNow,
            CheckInMethod = "manual"
        };

        _context.AttendanceLogs.Add(log);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Client checked in successfully", id = log.Id });
    }

    // POST: api/clients/{id}/check-out
    [Authorize(Policy = "AdminStaff")]
    [HttpPost("{id}/check-out")]
    public async Task<IActionResult> CheckOutClient(int id)
    {
        var log = await _context.AttendanceLogs
            .Where(al => al.ClientId == id && al.CheckOutTime == null)
            .OrderByDescending(al => al.CheckInTime)
            .FirstOrDefaultAsync();

        if (log == null)
            return NotFound("No active check-in found");

        log.CheckOutTime = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var duration = (log.CheckOutTime.Value - log.CheckInTime).TotalMinutes;
        return Ok(new { message = "Client checked out successfully", durationMinutes = duration });
    }
}

public class CreateClientRequest
{
    [Required, MaxLength(120)] public string Name { get; set; } = null!;
    [Required, EmailAddress, MaxLength(256)] public string Email { get; set; } = null!;
    [Required, MinLength(8), MaxLength(128)] public string Password { get; set; } = null!;
    [MaxLength(60)] public string? MembershipType { get; set; } = "standard";
    [MaxLength(60)] public string? DiscountCategory { get; set; } = "standard";
    public DateTime? MembershipExpiry { get; set; }
    // Null = llogarite nga pakoja + zbritja; vlerë (edhe 0) = çmim final i vendosur nga stafi.
    [Range(0, 1_000_000)] public decimal? MembershipPrice { get; set; }
}

public class UpdateClientRequest
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? NewPassword { get; set; }
    public string? MembershipType { get; set; }
    public string? DiscountCategory { get; set; }
    public DateTime? MembershipExpiry { get; set; }
    public bool? IsActive { get; set; }
    public int? TrainerId { get; set; } // 0 = hiqe trajnerin
}
