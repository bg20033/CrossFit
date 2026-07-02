using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;
using StandUpFitness.Services;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Desk")]
public class CashRegisterController : ControllerBase
{
    private readonly FitnessContext _context;

    public CashRegisterController(FitnessContext context)
    {
        _context = context;
    }

    // Resolve the current user to a Staff row, creating one on first use.
    private async Task<int?> GetOrCreateStaffIdAsync()
    {
        var userId = User.CurrentUserId();
        if (userId == null) return null;

        var staff = await _context.Staff.FirstOrDefaultAsync(s => s.UserId == userId.Value);
        if (staff == null)
        {
            var user = await _context.Users.FindAsync(userId.Value);
            if (user == null) return null;
            staff = new Staff { UserId = userId.Value, Position = "staff", IsActive = true };
            _context.Staff.Add(staff);
            await _context.SaveChangesAsync();
        }
        return staff.Id;
    }

    // GET: api/cashregister/current
    // "Current" = the most recently opened register that is still open, regardless of
    // calendar date. The old UTC-date filter (OpenedAt.Date == today) made a register
    // opened yesterday evening (gym-local) invisible after UTC midnight: /current
    // returned 404 while the register stayed open forever, and a second one could be
    // opened on top of it. An open register is current until it is explicitly closed.
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrentRegister()
    {
        var register = await _context.CashRegisters
            .Include(cr => cr.Staff)
                .ThenInclude(s => s.User)
            .Where(cr => cr.Status == "open")
            .OrderByDescending(cr => cr.OpenedAt)
            .FirstOrDefaultAsync();

        if (register == null)
            return NotFound(new { message = "No open register" });

        return Ok(new
        {
            register.Id,
            register.OpeningBalance,
            register.TotalIncome,
            register.TotalExpense,
            register.Status,
            Staff = register.Staff.User.Name,
            register.OpenedAt
        });
    }

    // POST: api/cashregister/open
    [HttpPost("open")]
    public async Task<IActionResult> OpenRegister([FromBody] OpenRegisterRequest request)
    {
        var staffId = await GetOrCreateStaffIdAsync();
        if (staffId == null)
            return Unauthorized();

        // One open register at a time for the whole desk (FinanceService links cash
        // movements to "the open register", so two open at once would split totals).
        var existingOpen = await _context.CashRegisters
            .FirstOrDefaultAsync(cr => cr.Status == "open");

        if (existingOpen != null)
            return BadRequest(new { message = "Ka tashmë një arkë të hapur — mbylle atë para se të hapësh një të re." });

        var register = new CashRegister
        {
            StaffId = staffId.Value,
            OpeningBalance = request.OpeningBalance,
            Status = "open",
            OpenedAt = DateTime.UtcNow
        };

        _context.CashRegisters.Add(register);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Register opened successfully", id = register.Id });
    }

    // POST: api/cashregister/{id}/close
    [HttpPost("{id}/close")]
    public async Task<IActionResult> CloseRegister(int id, [FromBody] CloseRegisterRequest request)
    {
        var register = await _context.CashRegisters.FindAsync(id);
        if (register == null)
            return NotFound();

        if (register.Status != "open")
            return BadRequest("Register is not open");

        register.Status = "closed";
        register.ClosedAt = DateTime.UtcNow;
        register.ClosingBalance = request.ClosingBalance;
        register.TotalIncome = await _context.Finances
            .Where(f => f.CashRegisterId == id && f.Type == "income")
            .SumAsync(f => f.Amount);
        register.TotalExpense = await _context.Finances
            .Where(f => f.CashRegisterId == id && f.Type == "expense")
            .SumAsync(f => f.Amount);

        await _context.SaveChangesAsync();

        var variance = register.ClosingBalance - (register.OpeningBalance + register.TotalIncome - register.TotalExpense);

        return Ok(new
        {
            message = "Register closed successfully",
            closingBalance = register.ClosingBalance,
            totalIncome = register.TotalIncome,
            totalExpense = register.TotalExpense,
            variance = variance
        });
    }

    // GET: api/cashregister/history?page=1&pageSize=10
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var total = await _context.CashRegisters.CountAsync();
        var registers = await _context.CashRegisters
            .Include(cr => cr.Staff)
            .OrderByDescending(cr => cr.OpenedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(cr => new
            {
                cr.Id,
                cr.Status,
                Staff = cr.Staff.User.Name,
                cr.OpenedAt,
                cr.ClosedAt,
                cr.OpeningBalance,
                cr.ClosingBalance,
                cr.TotalIncome,
                cr.TotalExpense
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, registers });
    }
}

public class OpenRegisterRequest
{
    public decimal OpeningBalance { get; set; }
}

public class CloseRegisterRequest
{
    public decimal ClosingBalance { get; set; }
}
