using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using StandUpFitness.Data;
using StandUpFitness.Models;
using StandUpFitness.Services;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly FitnessContext _context;

    public NotificationsController(FitnessContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Mine([FromQuery] bool unreadOnly = false, [FromQuery] int pageSize = 30)
    {
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();

        var query = _context.UserNotifications.AsNoTracking().Where(n => n.UserId == userId);
        if (unreadOnly) query = query.Where(n => !n.IsRead);

        var rows = await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(Math.Clamp(pageSize, 1, 100))
            .Select(n => new { n.Id, n.Title, n.Message, n.Type, n.Link, n.IsRead, n.CreatedAt })
            .ToListAsync();

        return Ok(rows);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount()
    {
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();
        var count = await _context.UserNotifications.CountAsync(n => n.UserId == userId && !n.IsRead);
        return Ok(new { count });
    }

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();
        var row = await _context.UserNotifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (row == null) return NotFound();
        row.IsRead = true;
        row.ReadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Read" });
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();
        var rows = await _context.UserNotifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync();
        foreach (var n in rows)
        {
            n.IsRead = true;
            n.ReadAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync();
        return Ok(new { message = "Read", count = rows.Count });
    }

    // Server-sent events for lightweight live notification updates.
    [HttpGet("stream")]
    public async Task Stream(CancellationToken cancellationToken)
    {
        var userId = User.CurrentUserId();
        if (userId == null)
        {
            Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        Response.Headers.ContentType = "text/event-stream";
        var lastId = await _context.UserNotifications.AsNoTracking()
            .Where(n => n.UserId == userId)
            .MaxAsync(n => (int?)n.Id, cancellationToken) ?? 0;

        while (!cancellationToken.IsCancellationRequested)
        {
            var notifications = await _context.UserNotifications.AsNoTracking()
                .Where(n => n.UserId == userId && n.Id > lastId)
                .OrderBy(n => n.Id)
                .Select(n => new { n.Id, n.Title, n.Message, n.Type, n.Link, n.IsRead, n.CreatedAt })
                .ToListAsync(cancellationToken);

            foreach (var n in notifications)
            {
                lastId = Math.Max(lastId, n.Id);
                await Response.WriteAsync($"event: notification\n", cancellationToken);
                await Response.WriteAsync($"data: {JsonSerializer.Serialize(n)}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }

            var unread = await _context.UserNotifications.CountAsync(n => n.UserId == userId && !n.IsRead, cancellationToken);
            await Response.WriteAsync($"event: unread\n", cancellationToken);
            await Response.WriteAsync($"data: {{\"count\":{unread}}}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
            await Task.Delay(TimeSpan.FromSeconds(15), cancellationToken);
        }
    }
}
