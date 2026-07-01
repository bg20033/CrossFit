using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/gymnotices")]
[Authorize]
public class GymNoticesController : ControllerBase
{
    private static readonly string[] NoticeTypes = ["announcement", "closure", "reschedule"];
    private static readonly string[] Audiences = ["all", "clients", "trainers", "staff"];
    private readonly FitnessContext _context;

    public GymNoticesController(FitnessContext context)
    {
        _context = context;
    }

    private int? CurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return int.TryParse(claim?.Value, out var id) ? id : null;
    }

    private UserRole? CurrentRole()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        return Enum.TryParse<UserRole>(role, ignoreCase: true, out var parsed) ? parsed : null;
    }

    [HttpGet]
    public async Task<IActionResult> Mine([FromQuery] int pageSize = 20)
    {
        var role = CurrentRole();
        if (role == null) return Unauthorized();

        var now = DateTime.UtcNow;
        var audience = AudienceForRole(role.Value);
        var rows = await _context.GymNotices.AsNoTracking()
            .Where(n => n.IsActive && n.StartsAt <= now && (n.EndsAt == null || n.EndsAt >= now))
            .Where(n => n.TargetAudience == "all" || n.TargetAudience == audience)
            .OrderByDescending(n => n.StartsAt)
            .Take(Math.Clamp(pageSize, 1, 100))
            .Select(n => new
            {
                n.Id,
                n.Type,
                n.TargetAudience,
                n.Title,
                n.Message,
                n.StartsAt,
                n.EndsAt,
                n.CreatedAt
            })
            .ToListAsync();

        return Ok(rows);
    }

    [HttpGet("admin")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> AdminList([FromQuery] bool includeInactive = false, [FromQuery] int pageSize = 50)
    {
        var query = _context.GymNotices.AsNoTracking();
        if (!includeInactive) query = query.Where(n => n.IsActive);

        var rows = await query
            .OrderByDescending(n => n.StartsAt)
            .Take(Math.Clamp(pageSize, 1, 200))
            .Select(n => new
            {
                n.Id,
                n.Type,
                n.TargetAudience,
                n.Title,
                n.Message,
                n.StartsAt,
                n.EndsAt,
                n.IsActive,
                CreatedBy = n.CreatedByUser.Name,
                n.CreatedAt
            })
            .ToListAsync();

        return Ok(rows);
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] CreateGymNoticeRequest request)
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized();

        var type = Normalize(request.Type, NoticeTypes, "announcement");
        var audience = Normalize(request.TargetAudience, Audiences, "all");
        if (request.EndsAt.HasValue && request.EndsAt.Value <= request.StartsAt)
            return BadRequest(new { message = "EndsAt must be after StartsAt." });

        var notice = new GymNotice
        {
            Type = type,
            TargetAudience = audience,
            Title = request.Title.Trim(),
            Message = request.Message.Trim(),
            StartsAt = request.StartsAt,
            EndsAt = request.EndsAt,
            CreatedByUserId = userId.Value
        };

        _context.GymNotices.Add(notice);

        var targetUsers = await TargetUsers(audience)
            .Select(u => u.Id)
            .ToListAsync();

        foreach (var targetUserId in targetUsers)
        {
            _context.UserNotifications.Add(new UserNotification
            {
                UserId = targetUserId,
                Title = notice.Title,
                Message = notice.Message,
                Type = NoticeTypeToNotificationType(type),
                Link = "/calendar"
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Notice created", id = notice.Id, notified = targetUsers.Count });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var notice = await _context.GymNotices.FirstOrDefaultAsync(n => n.Id == id);
        if (notice == null) return NotFound();

        notice.IsActive = false;
        notice.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Notice deactivated" });
    }

    private IQueryable<User> TargetUsers(string audience)
    {
        var query = _context.Users.Where(u => u.IsActive);
        return audience switch
        {
            "clients" => query.Where(u => u.Role == UserRole.Client || u.Role == UserRole.TenantClient),
            "trainers" => query.Where(u => u.Role == UserRole.Trainer || u.Role == UserRole.TrainerTenant),
            "staff" => query.Where(u => u.Role == UserRole.Admin || u.Role == UserRole.GymOwner || u.Role == UserRole.Staff || u.Role == UserRole.Cashier),
            _ => query
        };
    }

    private static string AudienceForRole(UserRole role)
    {
        return role switch
        {
            UserRole.Client or UserRole.TenantClient => "clients",
            UserRole.Trainer or UserRole.TrainerTenant => "trainers",
            _ => "staff"
        };
    }

    private static string Normalize(string? value, string[] allowed, string fallback)
    {
        var normalized = (value ?? fallback).Trim().ToLowerInvariant();
        return allowed.Contains(normalized) ? normalized : fallback;
    }

    private static string NoticeTypeToNotificationType(string type)
    {
        return type switch
        {
            "closure" => "warning",
            "reschedule" => "info",
            _ => "info"
        };
    }
}

public class CreateGymNoticeRequest
{
    public string Type { get; set; } = "announcement";
    public string TargetAudience { get; set; } = "all";
    [Required, MaxLength(160)] public string Title { get; set; } = null!;
    [Required, MaxLength(2000)] public string Message { get; set; } = null!;
    public DateTime StartsAt { get; set; } = DateTime.UtcNow;
    public DateTime? EndsAt { get; set; }
}
