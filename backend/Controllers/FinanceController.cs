using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class FinanceController : ControllerBase
{
    private readonly FitnessContext _context;

    public FinanceController(FitnessContext context)
    {
        _context = context;
    }

    // GET: api/finance/summary?startDate=2026-01-01&endDate=2026-12-31
    [HttpGet("summary")]
    public async Task<IActionResult> GetFinanceSummary([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        startDate ??= DateTime.UtcNow.AddMonths(-1);
        endDate ??= DateTime.UtcNow;

        var income = await _context.Finances
            .Where(f => f.Type == "income" && f.TransactionDate >= startDate && f.TransactionDate <= endDate)
            .SumAsync(f => f.Amount);

        var expenses = await _context.Finances
            .Where(f => f.Type == "expense" && f.TransactionDate >= startDate && f.TransactionDate <= endDate)
            .SumAsync(f => f.Amount);

        var balance = income - expenses;

        return Ok(new
        {
            startDate,
            endDate,
            totalIncome = income,
            totalExpenses = expenses,
            balance = balance
        });
    }

    // GET: api/finance/transactions?type=income&category=1&page=1&pageSize=10
    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] string? type,
        [FromQuery] int? categoryId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var query = _context.Finances
            .Include(f => f.Category)
            .AsQueryable();

        if (!string.IsNullOrEmpty(type))
            query = query.Where(f => f.Type == type);

        if (categoryId.HasValue)
            query = query.Where(f => f.CategoryId == categoryId);

        var total = await query.CountAsync();
        var transactions = await query
            .OrderByDescending(f => f.TransactionDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(f => new
            {
                f.Id,
                f.Type,
                f.Amount,
                f.Description,
                Category = f.Category.Name,
                f.PaymentMethod,
                f.Status,
                f.TransactionDate
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, transactions });
    }

    // POST: api/finance/add-transaction
    [HttpPost("add-transaction")]
    public async Task<IActionResult> AddTransaction([FromBody] AddTransactionRequest request)
    {
        var category = await _context.FinanceCategories.FindAsync(request.CategoryId);
        if (category == null)
            return BadRequest("Category not found");

        var finance = new Finance
        {
            Type = request.Type,
            CategoryId = request.CategoryId,
            Amount = request.Amount,
            Description = request.Description,
            PaymentMethod = request.PaymentMethod,
            UserId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0"),
            TransactionDate = request.TransactionDate ?? DateTime.UtcNow
        };

        _context.Finances.Add(finance);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Transaction added successfully", id = finance.Id });
    }

    // GET: api/finance/categories
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories([FromQuery] string? type)
    {
        var query = _context.FinanceCategories.AsQueryable();

        if (!string.IsNullOrEmpty(type))
            query = query.Where(fc => fc.Type == type);

        var categories = await query
            .OrderBy(fc => fc.Name)
            .Select(fc => new { fc.Id, fc.Name, fc.Type, fc.Description })
            .ToListAsync();

        return Ok(categories);
    }

    // POST: api/finance/add-category
    [HttpPost("add-category")]
    public async Task<IActionResult> AddCategory([FromBody] AddCategoryRequest request)
    {
        var existing = await _context.FinanceCategories
            .FirstOrDefaultAsync(fc => fc.Name == request.Name && fc.Type == request.Type);

        if (existing != null)
            return BadRequest("Category already exists");

        var category = new FinanceCategory
        {
            Name = request.Name,
            Type = request.Type,
            Description = request.Description
        };

        _context.FinanceCategories.Add(category);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Category added successfully", id = category.Id });
    }

    // GET: api/finance/monthly-report?year=2026&month=6
    [HttpGet("monthly-report")]
    public async Task<IActionResult> GetMonthlyReport([FromQuery] int year, [FromQuery] int month)
    {
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var income = await _context.Finances
            .Where(f => f.Type == "income" && f.TransactionDate >= startDate && f.TransactionDate <= endDate)
            .GroupBy(f => f.Category.Name)
            .Select(g => new { category = g.Key, amount = g.Sum(f => f.Amount) })
            .ToListAsync();

        var expenses = await _context.Finances
            .Where(f => f.Type == "expense" && f.TransactionDate >= startDate && f.TransactionDate <= endDate)
            .GroupBy(f => f.Category.Name)
            .Select(g => new { category = g.Key, amount = g.Sum(f => f.Amount) })
            .ToListAsync();

        var totalIncome = income.Sum(i => i.amount);
        var totalExpense = expenses.Sum(e => e.amount);

        return Ok(new
        {
            period = $"{year}-{month:D2}",
            income = new { total = totalIncome, byCategory = income },
            expenses = new { total = totalExpense, byCategory = expenses },
            balance = totalIncome - totalExpense
        });
    }
}

public class AddTransactionRequest
{
    public string Type { get; set; } = null!; // income or expense
    public int CategoryId { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = "cash";
    public DateTime? TransactionDate { get; set; }
}

public class AddCategoryRequest
{
    public string Name { get; set; } = null!;
    public string Type { get; set; } = null!; // income or expense
    public string Description { get; set; } = string.Empty;
}
