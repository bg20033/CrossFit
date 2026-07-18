using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Services;

public interface IInventoryService
{
    Task<int> CurrentStockAsync(int productId);
    Task AddStockAsync(int productId, int quantity, decimal? unitCost, string? notes, int? staffId);
    Task RemoveStockForSaleAsync(IEnumerable<InvoiceItem> soldItems, int? staffId);
}

public class InventoryService : IInventoryService
{
    private readonly FitnessContext _context;

    public InventoryService(FitnessContext context) => _context = context;

    public Task<int> CurrentStockAsync(int productId) =>
        CalculateStockAsync(productId);

    public async Task AddStockAsync(int productId, int quantity, decimal? unitCost, string? notes, int? staffId)
    {
        if (quantity <= 0) throw new ArgumentException("Quantity must be positive", nameof(quantity));

        var product = await _context.Products.FindAsync(productId)
            ?? throw new InvalidOperationException("Product not found");

        _context.StockMovements.Add(new StockMovement
        {
            ProductId = productId,
            MovementType = "in",
            Quantity = quantity,
            UnitCost = unitCost,
            Notes = notes,
            StaffId = staffId
        });

        product.UpdatedAt = DateTime.UtcNow;
    }

    public async Task RemoveStockForSaleAsync(IEnumerable<InvoiceItem> soldItems, int? staffId)
    {
        var items = soldItems.Where(i => i.ProductId.HasValue && i.Quantity > 0).ToList();
        if (items.Count == 0) return;

        var grouped = items.GroupBy(i => i.ProductId!.Value)
            .Select(g => new { ProductId = g.Key, Quantity = g.Sum(i => i.Quantity) })
            .ToList();

        foreach (var group in grouped)
        {
            var stock = await CalculateStockAsync(group.ProductId);
            if (stock < group.Quantity)
            {
                var product = await _context.Products.FindAsync(group.ProductId);
                throw new InvalidOperationException(
                    $"Stock insufficient for '{product?.Name ?? "product"}'. Available: {stock}, requested: {group.Quantity}");
            }
        }

        foreach (var item in items)
        {
            _context.StockMovements.Add(new StockMovement
            {
                ProductId = item.ProductId!.Value,
                MovementType = "sale",
                Quantity = item.Quantity,
                InvoiceItem = item,
                StaffId = staffId
            });
        }
    }

    // Signed sum runs as a single SQL CASE aggregate instead of materializing
    // every movement row. "adjustment" is already stored with sign.
    private async Task<int> CalculateStockAsync(int productId) =>
        await _context.StockMovements
            .Where(s => s.ProductId == productId)
            .SumAsync(s =>
                s.MovementType == "in" || s.MovementType == "return" ? s.Quantity
                : s.MovementType == "sale" ? -s.Quantity
                : s.MovementType == "adjustment" ? s.Quantity
                : 0);
}
