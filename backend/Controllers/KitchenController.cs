using Microsoft.AspNetCore.Authorization;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/kitchen")]
[Authorize]
public class KitchenController : ControllerBase
{
    private readonly FitnessContext _context;
    public KitchenController(FitnessContext context) => _context = context;

    private int? Uid()
    {
        var c = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(c, out var id) ? id : null;
    }

    // ---- Recipes ----
    [HttpGet("recipes")]
    public async Task<IActionResult> Recipes()
    {
        var uid = Uid();
        if (uid == null) return Forbid();
        var rows = await _context.Recipes
            .Where(r => r.UserId == uid)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new { r.Id, r.Name, r.Servings, r.ItemsJson })
            .ToListAsync();
        return Ok(rows);
    }

    [HttpPost("recipes")]
    public async Task<IActionResult> CreateRecipe([FromBody] RecipeRequest request)
    {
        var uid = Uid();
        if (uid == null) return Forbid();
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "Name required" });
        if (request.Servings < 1 || request.Servings > 100) return BadRequest(new { message = "Servings must be between 1 and 100" });
        var itemsJson = string.IsNullOrWhiteSpace(request.ItemsJson) ? "[]" : request.ItemsJson;
        try
        {
            using var doc = JsonDocument.Parse(itemsJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return BadRequest(new { message = "Items must be an array" });
        }
        catch (JsonException)
        {
            return BadRequest(new { message = "Items JSON is invalid" });
        }
        var r = new Recipe
        {
            UserId = uid.Value,
            Name = request.Name.Trim(),
            Servings = request.Servings,
            ItemsJson = itemsJson,
        };
        _context.Recipes.Add(r);
        await _context.SaveChangesAsync();
        return Ok(new { r.Id });
    }

    [HttpDelete("recipes/{id}")]
    public async Task<IActionResult> DeleteRecipe(int id)
    {
        var uid = Uid();
        var r = await _context.Recipes.FindAsync(id);
        if (r == null) return NotFound();
        if (r.UserId != uid) return Forbid();
        _context.Recipes.Remove(r);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Deleted" });
    }

    // ---- Shopping list ----
    [HttpGet("shopping")]
    public async Task<IActionResult> Shopping()
    {
        var uid = Uid();
        if (uid == null) return Forbid();
        var rows = await _context.ShoppingItems
            .Where(s => s.UserId == uid)
            .OrderBy(s => s.CreatedAt)
            .Select(s => new { s.Id, s.Name, s.Checked })
            .ToListAsync();
        return Ok(rows);
    }

    [HttpPost("shopping")]
    public async Task<IActionResult> AddShopping([FromBody] ShoppingRequest request)
    {
        var uid = Uid();
        if (uid == null) return Forbid();
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "Name required" });
        var name = request.Name.Trim();
        var existing = await _context.ShoppingItems.FirstOrDefaultAsync(s => s.UserId == uid && s.Name == name);
        if (existing != null) return Ok(new { existing.Id, message = "Exists" });
        var item = new ShoppingItem { UserId = uid.Value, Name = name };
        _context.ShoppingItems.Add(item);
        await _context.SaveChangesAsync();
        return Ok(new { item.Id });
    }

    [HttpPut("shopping/{id}")]
    public async Task<IActionResult> ToggleShopping(int id, [FromBody] ShoppingToggle request)
    {
        var uid = Uid();
        var item = await _context.ShoppingItems.FindAsync(id);
        if (item == null) return NotFound();
        if (item.UserId != uid) return Forbid();
        item.Checked = request.Checked;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Updated" });
    }

    [HttpDelete("shopping/{id}")]
    public async Task<IActionResult> DeleteShopping(int id)
    {
        var uid = Uid();
        var item = await _context.ShoppingItems.FindAsync(id);
        if (item == null) return NotFound();
        if (item.UserId != uid) return Forbid();
        _context.ShoppingItems.Remove(item);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Deleted" });
    }
}

public class RecipeRequest
{
    [Required, MaxLength(120)] public string Name { get; set; } = null!;
    public int Servings { get; set; } = 1;
    public string? ItemsJson { get; set; }
}

public class ShoppingRequest
{
    [Required, MaxLength(120)] public string Name { get; set; } = null!;
}

public class ShoppingToggle
{
    public bool Checked { get; set; }
}
