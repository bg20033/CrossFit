using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using StandUpFitness.Data;
using StandUpFitness.Models;
using StandUpFitness.Services;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly FitnessContext _context;
    private readonly IInventoryService _inventory;

    public InventoryController(FitnessContext context, IInventoryService inventory)
    {
        _context = context;
        _inventory = inventory;
    }

    [HttpGet("products")]
    [Authorize(Policy = "Desk")]
    public async Task<IActionResult> GetProducts()
    {
        var products = await _context.Products
            .AsNoTracking()
            .OrderBy(p => p.Name)
            .ToListAsync();

        var productIds = products.Select(p => p.Id).ToList();
        var movements = await _context.StockMovements
            .Where(s => productIds.Contains(s.ProductId))
            .GroupBy(s => s.ProductId)
            .Select(g => new
            {
                ProductId = g.Key,
                Stock = g.Sum(s => s.MovementType == "in" || s.MovementType == "return" ? s.Quantity
                    : s.MovementType == "sale" ? -s.Quantity
                    : s.MovementType == "adjustment" ? s.Quantity
                    : 0)
            })
            .ToListAsync();

        var stockMap = movements.ToDictionary(x => x.ProductId, x => x.Stock);

        return Ok(products.Select(p => new
        {
            p.Id,
            p.Name,
            p.Sku,
            p.Description,
            p.Unit,
            p.SalePrice,
            p.CostPrice,
            p.LowStockThreshold,
            p.IsActive,
            Stock = stockMap.GetValueOrDefault(p.Id, 0)
        }));
    }

    [HttpGet("products/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetProduct(int id)
    {
        var product = await _context.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        if (product == null) return NotFound();

        var stock = await _inventory.CurrentStockAsync(id);
        return Ok(new
        {
            product.Id,
            product.Name,
            product.Sku,
            product.Description,
            product.Unit,
            product.SalePrice,
            product.CostPrice,
            product.LowStockThreshold,
            product.IsActive,
            Stock = stock
        });
    }

    [HttpPost("products")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> CreateProduct([FromBody] ProductRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "Name is required" });
        if (request.SalePrice < 0) return BadRequest(new { message = "Sale price must be non-negative" });

        var product = new Product
        {
            Name = request.Name.Trim(),
            Sku = string.IsNullOrWhiteSpace(request.Sku) ? null : request.Sku.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Unit = string.IsNullOrWhiteSpace(request.Unit) ? null : request.Unit.Trim(),
            SalePrice = request.SalePrice,
            CostPrice = request.CostPrice,
            LowStockThreshold = request.LowStockThreshold,
            IsActive = request.IsActive
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        if (request.InitialStock > 0)
        {
            await _inventory.AddStockAsync(product.Id, request.InitialStock, request.CostPrice, "Stoku fillestar", User.CurrentUserId());
            await _context.SaveChangesAsync();
        }

        return Ok(new { product.Id, product.Name });
    }

    [HttpPut("products/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateProduct(int id, [FromBody] ProductRequest request)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null) return NotFound();
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "Name is required" });
        if (request.SalePrice < 0) return BadRequest(new { message = "Sale price must be non-negative" });

        product.Name = request.Name.Trim();
        product.Sku = string.IsNullOrWhiteSpace(request.Sku) ? null : request.Sku.Trim();
        product.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        product.Unit = string.IsNullOrWhiteSpace(request.Unit) ? null : request.Unit.Trim();
        product.SalePrice = request.SalePrice;
        product.CostPrice = request.CostPrice;
        product.LowStockThreshold = request.LowStockThreshold;
        product.IsActive = request.IsActive;
        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { product.Id, product.Name });
    }

    [HttpDelete("products/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteProduct(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null) return NotFound();

        var hasMovements = await _context.StockMovements.AnyAsync(s => s.ProductId == id);
        if (hasMovements)
        {
            product.IsActive = false;
            product.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Product has stock history; deactivated instead of deleted" });
        }

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Product deleted" });
    }

    [HttpPost("products/{id:int}/stock-in")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> StockIn(int id, [FromBody] StockInRequest request)
    {
        if (request.Quantity <= 0) return BadRequest(new { message = "Quantity must be positive" });

        var product = await _context.Products.FindAsync(id);
        if (product == null) return NotFound();

        await _inventory.AddStockAsync(id, request.Quantity, request.UnitCost, request.Notes, User.CurrentUserId());
        await _context.SaveChangesAsync();

        var stock = await _inventory.CurrentStockAsync(id);
        return Ok(new { message = "Stock added", currentStock = stock });
    }

    [HttpPost("products/{id:int}/adjust")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> AdjustStock(int id, [FromBody] AdjustStockRequest request)
    {
        if (request.Delta == 0) return BadRequest(new { message = "Delta must be non-zero" });

        var product = await _context.Products.FindAsync(id);
        if (product == null) return NotFound();

        var stock = await _inventory.CurrentStockAsync(id);
        if (stock + request.Delta < 0)
            return BadRequest(new { message = $"Stoku nuk mund të bjerë nën zero (aktual: {stock})" });

        if (request.Delta > 0)
        {
            await _inventory.AddStockAsync(id, request.Delta, request.UnitCost, request.Notes, User.CurrentUserId());
        }
        else
        {
            _context.StockMovements.Add(new StockMovement
            {
                ProductId = id,
                MovementType = "adjustment",
                Quantity = request.Delta, // adjustment is stored with sign
                Notes = request.Notes,
                StaffId = User.CurrentUserId()
            });
            product.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Stock adjusted", currentStock = stock + request.Delta });
    }

    [HttpGet("products/{id:int}/movements")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetMovements(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null) return NotFound();

        var movements = await _context.StockMovements
            .AsNoTracking()
            .Where(s => s.ProductId == id)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new
            {
                s.Id,
                s.MovementType,
                s.Quantity,
                s.UnitCost,
                s.Notes,
                s.CreatedAt
            })
            .ToListAsync();

        return Ok(movements);
    }
}

public class ProductRequest
{
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    [MaxLength(80)] public string? Sku { get; set; }
    [MaxLength(500)] public string? Description { get; set; }
    [MaxLength(40)] public string? Unit { get; set; }
    [Range(0, 1_000_000)] public decimal SalePrice { get; set; }
    [Range(0, 1_000_000)] public decimal? CostPrice { get; set; }
    [Range(0, int.MaxValue)] public int LowStockThreshold { get; set; } = 10;
    public bool IsActive { get; set; } = true;
    /// Optional starting quantity recorded as a stock-in when the product is created.
    [Range(0, int.MaxValue)] public int InitialStock { get; set; } = 0;
}

public class AdjustStockRequest
{
    [Range(int.MinValue, int.MaxValue)] public int Delta { get; set; }
    [Range(0, 1_000_000)] public decimal? UnitCost { get; set; }
    [MaxLength(300)] public string? Notes { get; set; }
}

public class StockInRequest
{
    [Range(1, int.MaxValue)] public int Quantity { get; set; }
    [Range(0, 1_000_000)] public decimal? UnitCost { get; set; }
    [MaxLength(300)] public string? Notes { get; set; }
}
