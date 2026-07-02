using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/discounts")]
[Authorize]
public class DiscountsController : ControllerBase
{
    private readonly FitnessContext _context;

    public DiscountsController(FitnessContext context) => _context = context;

    [HttpGet]
    [Authorize(Policy = "AdminStaff")]
    public async Task<IActionResult> GetAll()
    {
        var categories = await _context.DiscountCategories
            .AsNoTracking()
            .OrderBy(d => d.Id)
            .Select(d => new
            {
                d.Id,
                d.Key,
                d.Name,
                d.DiscountPercent,
                d.IsBuiltIn,
                d.IsActive
            })
            .ToListAsync();
        return Ok(categories);
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetById(int id)
    {
        var category = await _context.DiscountCategories.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id);
        if (category == null) return NotFound();
        return Ok(category);
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] DiscountCategoryRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var key = request.Key!.Trim().ToLowerInvariant();
        if (await _context.DiscountCategories.AnyAsync(d => d.Key == key))
            return BadRequest(new { message = "A discount category with this key already exists" });

        var category = new DiscountCategory
        {
            Key = key,
            Name = request.Name!.Trim(),
            DiscountPercent = Clamp(request.DiscountPercent),
            IsActive = request.IsActive
        };

        _context.DiscountCategories.Add(category);
        await _context.SaveChangesAsync();
        return Ok(new { category.Id, category.Key, category.Name });
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Update(int id, [FromBody] DiscountCategoryRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var category = await _context.DiscountCategories.FindAsync(id);
        if (category == null) return NotFound();

        // Ndryshimi i çelësit: më parë pranohej nga UI por injorohej në heshtje.
        // Lejohet vetëm për kategori jo të sistemit; klientët që e mbajnë çelësin
        // e vjetër migrohen bashkë me të, që zbritja të mos u humbasë.
        var newKey = request.Key?.Trim().ToLowerInvariant();
        var renaming = !string.IsNullOrWhiteSpace(newKey) && newKey != category.Key;
        if (renaming)
        {
            if (category.IsBuiltIn)
                return BadRequest(new { message = "Çelësi i kategorive të sistemit nuk mund të ndryshohet." });
            if (await _context.DiscountCategories.AnyAsync(d => d.Key == newKey && d.Id != id))
                return BadRequest(new { message = "Ekziston një kategori me këtë çelës." });
        }

        await using var tx = await _context.Database.BeginTransactionAsync();

        if (renaming)
        {
            var oldKey = category.Key;
            category.Key = newKey!;
            await _context.Clients
                .Where(c => c.DiscountCategory == oldKey)
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.DiscountCategory, newKey));
        }

        category.Name = request.Name!.Trim();
        category.DiscountPercent = Clamp(request.DiscountPercent);
        category.IsActive = request.IsActive;
        category.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await tx.CommitAsync();
        return Ok(new { category.Id, category.Key, category.Name, category.DiscountPercent });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var category = await _context.DiscountCategories.FindAsync(id);
        if (category == null) return NotFound();
        if (category.IsBuiltIn)
        {
            category.IsActive = false;
            category.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Built-in category deactivated instead of deleted" });
        }

        // Klientët që mbanin këtë kategori kalojnë te "standard" — përndryshe
        // mbeteshin me çelës jetim (0% në heshtje, dhe s'shfaqej në dropdown).
        await using var tx = await _context.Database.BeginTransactionAsync();
        var reassigned = await _context.Clients
            .Where(c => c.DiscountCategory == category.Key)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.DiscountCategory, "standard"));

        _context.DiscountCategories.Remove(category);
        await _context.SaveChangesAsync();
        await tx.CommitAsync();
        return Ok(new { message = "Discount category deleted", reassignedClients = reassigned });
    }

    private static int Clamp(int value) => Math.Clamp(value, 0, 100);
}

public class DiscountCategoryRequest
{
    [Required, MaxLength(40)] public string? Key { get; set; }
    [Required, MaxLength(120)] public string? Name { get; set; }
    [Range(0, 100)] public int DiscountPercent { get; set; }
    public bool IsActive { get; set; } = true;
}
