using Microsoft.AspNetCore.Authorization;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;
using StandUpFitness.Services;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/progressphotos")]
[Authorize]
public class ProgressPhotosController : ControllerBase
{
    private readonly FitnessContext _context;
    public ProgressPhotosController(FitnessContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int clientId)
    {
        if (!await _context.CanAccessCoreClientAsync(User, clientId)) return Forbid();
        var rows = await _context.ProgressPhotos
            .Where(p => p.ClientId == clientId)
            .OrderByDescending(p => p.Date)
            .Select(p => new { p.Id, p.ClientId, p.Date, p.Pose, p.DataUrl, p.Weight })
            .ToListAsync();
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ProgressPhotoRequest request)
    {
        if (request.ClientId < 1) return BadRequest(new { message = "Client is required" });
        if (!await _context.CanAccessCoreClientAsync(User, request.ClientId)) return Forbid();
        if (string.IsNullOrWhiteSpace(request.DataUrl)) return BadRequest(new { message = "Image required" });
        if (!request.DataUrl.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Image must be a data URL" });
        if (request.Date.HasValue && request.Date.Value.Date > DateTime.UtcNow.Date.AddDays(1))
            return BadRequest(new { message = "Date cannot be in the future" });
        var pose = (request.Pose ?? "front").Trim().ToLowerInvariant();
        if (!new[] { "front", "side", "back" }.Contains(pose))
            return BadRequest(new { message = "Invalid photo pose" });
        if (request.Weight.HasValue && (request.Weight.Value <= 0 || request.Weight.Value > 1000))
            return BadRequest(new { message = "Weight must be greater than zero" });
        var photo = new ProgressPhoto
        {
            ClientId = request.ClientId,
            Date = request.Date ?? DateTime.UtcNow,
            Pose = pose,
            DataUrl = request.DataUrl,
            Weight = request.Weight,
        };
        _context.ProgressPhotos.Add(photo);
        await _context.SaveChangesAsync();
        return Ok(new { photo.Id });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var photo = await _context.ProgressPhotos.FindAsync(id);
        if (photo == null) return NotFound();
        if (!await _context.CanAccessCoreClientAsync(User, photo.ClientId)) return Forbid();
        _context.ProgressPhotos.Remove(photo);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Deleted" });
    }
}

public class ProgressPhotoRequest
{
    public int ClientId { get; set; }
    public DateTime? Date { get; set; }
    [MaxLength(20)] public string? Pose { get; set; }
    public string DataUrl { get; set; } = string.Empty;
    public decimal? Weight { get; set; }
}
