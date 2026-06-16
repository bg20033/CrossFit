using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class StaffController : ControllerBase
{
    private readonly FitnessContext _context;

    public StaffController(FitnessContext context)
    {
        _context = context;
    }

    // GET: api/staff?page=1&pageSize=10
    [HttpGet]
    public async Task<IActionResult> GetStaff(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null)
    {
        var query = _context.Staff
            .Include(s => s.User)
            .AsQueryable();

        if (!string.IsNullOrEmpty(search))
            query = query.Where(s => s.User.Name.Contains(search) || s.User.Email.Contains(search));

        var total = await query.CountAsync();
        var staff = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new
            {
                s.Id,
                UserId = s.User.Id,
                s.User.Name,
                s.User.Email,
                s.Position,
                s.Salary,
                s.IsActive,
                s.HireDate,
                s.CreatedAt
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, staff });
    }

    // GET: api/staff/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetStaffMember(int id)
    {
        var staff = await _context.Staff
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (staff == null)
            return NotFound();

        var salaries = await _context.Salaries
            .Where(s => s.StaffId == id && s.Status == "paid")
            .SumAsync(s => s.TotalAmount);

        return Ok(new
        {
            staff.Id,
            staff.User.Name,
            staff.User.Email,
            staff.Position,
            staff.Salary,
            staff.IsActive,
            staff.HireDate,
            staff.TerminationDate,
            TotalPaidSalary = salaries,
            staff.CreatedAt
        });
    }

    // POST: api/staff/create
    [HttpPost("create")]
    public async Task<IActionResult> CreateStaff([FromBody] CreateStaffRequest request)
    {
        var userExists = await _context.Users.AnyAsync(u => u.Email == request.Email);
        if (userExists)
            return BadRequest("Email already exists");

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var user = new User
        {
            Email = request.Email,
            Name = request.Name,
            PasswordHash = passwordHash,
            Role = UserRole.Staff
        };

        var staff = new Staff
        {
            User = user,
            Position = request.Position,
            Salary = request.Salary,
            HireDate = DateTime.UtcNow,
            IsActive = true
        };

        _context.Users.Add(user);
        _context.Staff.Add(staff);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Staff member created successfully", id = staff.Id });
    }

    // PUT: api/staff/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateStaff(int id, [FromBody] UpdateStaffRequest request)
    {
        var staff = await _context.Staff
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (staff == null)
            return NotFound();

        if (request.Name != null)
            staff.User.Name = request.Name;

        staff.Position = request.Position ?? staff.Position;
        staff.Salary = request.Salary ?? staff.Salary;
        staff.IsActive = request.IsActive ?? staff.IsActive;

        staff.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Staff member updated successfully" });
    }

    // DELETE: api/staff/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteStaff(int id)
    {
        var staff = await _context.Staff.FindAsync(id);
        if (staff == null)
            return NotFound();

        staff.IsActive = false;
        staff.TerminationDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Staff member deactivated successfully" });
    }

    // GET: api/staff/{id}/salaries?year=2026&month=6
    [HttpGet("{id}/salaries")]
    public async Task<IActionResult> GetStaffSalaries(int id, [FromQuery] int? year, [FromQuery] int? month)
    {
        var query = _context.Salaries.Where(s => s.StaffId == id);

        if (year.HasValue)
            query = query.Where(s => s.Year == year);

        if (month.HasValue)
            query = query.Where(s => s.Month == month);

        var salaries = await query
            .OrderByDescending(s => new { s.Year, s.Month })
            .Select(s => new
            {
                s.Id,
                Period = $"{s.Year}-{s.Month:D2}",
                s.BaseSalary,
                s.HoursWorked,
                s.Bonus,
                s.Deductions,
                s.TotalAmount,
                s.Status,
                s.PaidDate
            })
            .ToListAsync();

        return Ok(salaries);
    }

    // POST: api/staff/{id}/calculate-salary
    [HttpPost("{id}/calculate-salary")]
    public async Task<IActionResult> CalculateSalary(int id, [FromBody] CalculateSalaryRequest request)
    {
        var staff = await _context.Staff.FindAsync(id);
        if (staff == null)
            return NotFound();

        // Check if salary already calculated for this period
        var existing = await _context.Salaries
            .FirstOrDefaultAsync(s => s.StaffId == id && s.Year == request.Year && s.Month == request.Month);

        if (existing != null && existing.Status == "paid")
            return BadRequest("Salary already paid for this period");

        var baseSalary = staff.Salary;
        var overtimeAmount = request.OvertimeHours * staff.Salary * 1.5m / 160; // Assuming 160 hours/month
        var totalAmount = baseSalary + overtimeAmount + request.Bonus - request.Deductions;

        var salary = new Salary
        {
            StaffId = id,
            Year = request.Year,
            Month = request.Month,
            BaseSalary = baseSalary,
            HoursWorked = request.HoursWorked,
            HourlyRate = staff.Salary / 160, // Approximate hourly rate
            OvertimeHours = request.OvertimeHours,
            Bonus = request.Bonus,
            Deductions = request.Deductions,
            TotalAmount = totalAmount,
            Status = "pending",
            Notes = request.Notes
        };

        _context.Salaries.Add(salary);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Salary calculated successfully",
            totalAmount = totalAmount,
            breakdown = new
            {
                baseSalary,
                overtimeAmount,
                bonus = request.Bonus,
                deductions = request.Deductions
            }
        });
    }
}

public class CreateStaffRequest
{
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string Position { get; set; } = null!;
    public decimal Salary { get; set; }
}

public class UpdateStaffRequest
{
    public string? Name { get; set; }
    public string? Position { get; set; }
    public decimal? Salary { get; set; }
    public bool? IsActive { get; set; }
}

public class CalculateSalaryRequest
{
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal HoursWorked { get; set; }
    public decimal OvertimeHours { get; set; } = 0;
    public decimal Bonus { get; set; } = 0;
    public decimal Deductions { get; set; } = 0;
    public string? Notes { get; set; }
}
