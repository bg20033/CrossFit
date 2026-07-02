using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Services;

/// <summary>
/// Single place every euro flows through. Guarantees:
///  • categories are resolved get-or-create (no more hardcoded "CategoryId = 1" fallbacks),
///  • cash transactions are linked to the currently open cash register, so the
///    register close (TotalIncome/TotalExpense/variance) finally adds up —
///    previously nothing ever set Finance.CashRegisterId and every close showed 0.
/// The created Finance row is added to the context but NOT saved — callers commit
/// it together with their own changes in one SaveChanges (atomic).
/// </summary>
public interface IFinanceService
{
    Task<FinanceCategory> GetOrCreateCategoryAsync(string name, string type, string? description = null);
    Task<Finance> RecordIncomeAsync(string categoryName, decimal amount, string description,
        string paymentMethod = "cash", int? userId = null, DateTime? transactionDate = null);
    Task<Finance> RecordExpenseAsync(string categoryName, decimal amount, string description,
        string paymentMethod = "cash", int? userId = null, DateTime? transactionDate = null);
    Task<int?> FindOpenCashRegisterIdAsync();
}

public class FinanceService : IFinanceService
{
    // Canonical system category names.
    public const string MemberPayments = "Member Payments";
    public const string TrainerCommissions = "Trainer Commissions";
    public const string Salaries = "Salaries";
    public const string Refunds = "Refunds";
    public const string Rental = "Rental";

    private readonly FitnessContext _context;

    public FinanceService(FitnessContext context) => _context = context;

    public async Task<FinanceCategory> GetOrCreateCategoryAsync(string name, string type, string? description = null)
    {
        // Prefer an already-tracked (just-created, unsaved) category to stay
        // idempotent within a single request.
        var local = _context.FinanceCategories.Local
            .FirstOrDefault(c => c.Name == name && c.Type == type);
        if (local != null) return local;

        var category = await _context.FinanceCategories
            .FirstOrDefaultAsync(c => c.Name == name && c.Type == type);
        if (category != null) return category;

        category = new FinanceCategory
        {
            Name = name,
            Type = type,
            Description = description ?? name,
            IsSystem = true,
            IsActive = true
        };
        _context.FinanceCategories.Add(category);
        return category;
    }

    public Task<Finance> RecordIncomeAsync(string categoryName, decimal amount, string description,
        string paymentMethod = "cash", int? userId = null, DateTime? transactionDate = null) =>
        RecordAsync("income", categoryName, amount, description, paymentMethod, userId, transactionDate);

    public Task<Finance> RecordExpenseAsync(string categoryName, decimal amount, string description,
        string paymentMethod = "cash", int? userId = null, DateTime? transactionDate = null) =>
        RecordAsync("expense", categoryName, amount, description, paymentMethod, userId, transactionDate);

    private async Task<Finance> RecordAsync(string type, string categoryName, decimal amount, string description,
        string paymentMethod, int? userId, DateTime? transactionDate)
    {
        var category = await GetOrCreateCategoryAsync(categoryName, type);
        var finance = new Finance
        {
            Type = type,
            Category = category,
            Amount = amount,
            Description = description,
            PaymentMethod = paymentMethod,
            UserId = userId,
            TransactionDate = transactionDate ?? DateTime.UtcNow,
            Status = "completed",
            CashRegisterId = IsCashLike(paymentMethod) ? await FindOpenCashRegisterIdAsync() : null
        };
        _context.Finances.Add(finance);
        return finance;
    }

    private static bool IsCashLike(string method) =>
        string.Equals(method, "cash", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(method, "pos", StringComparison.OrdinalIgnoreCase);

    public async Task<int?> FindOpenCashRegisterIdAsync() =>
        await _context.CashRegisters
            .Where(cr => cr.Status == "open")
            .OrderByDescending(cr => cr.OpenedAt)
            .Select(cr => (int?)cr.Id)
            .FirstOrDefaultAsync();
}
