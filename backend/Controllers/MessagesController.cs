using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/messages")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly FitnessContext _context;

    public MessagesController(FitnessContext context)
    {
        _context = context;
    }

    private int? CurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return int.TryParse(claim?.Value, out var id) ? id : null;
    }

    [HttpGet("inbox")]
    public async Task<IActionResult> Inbox()
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized();

        var rows = await _context.DirectMessages
            .Include(m => m.Sender)
            .Include(m => m.Receiver)
            .Where(m => m.SenderUserId == userId || m.ReceiverUserId == userId)
            .OrderByDescending(m => m.SentAt)
            .Take(100)
            .ToListAsync();

        var conversations = rows
            .GroupBy(m => m.SenderUserId == userId ? m.ReceiverUserId : m.SenderUserId)
            .Select(g =>
            {
                var last = g.OrderByDescending(m => m.SentAt).First();
                var other = last.SenderUserId == userId ? last.Receiver : last.Sender;
                return new
                {
                    userId = other.Id,
                    other.Name,
                    other.Email,
                    lastMessage = last.Body,
                    last.SentAt,
                    unread = g.Count(m => m.ReceiverUserId == userId && m.ReadAt == null)
                };
            })
            .OrderByDescending(c => c.SentAt)
            .ToList();

        return Ok(conversations);
    }

    [HttpGet("contacts")]
    public async Task<IActionResult> Contacts([FromQuery] string? q = null)
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized();

        var query = _context.Users
            .Where(u => u.Id != userId && u.IsActive);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(u => u.Name.Contains(term) || u.Email.Contains(term));
        }

        var users = await query
            .OrderBy(u => u.Name)
            .Take(50)
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Email,
                Role = u.Role.ToString()
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("thread/{otherUserId:int}")]
    public async Task<IActionResult> Thread(int otherUserId)
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized();

        var messages = await _context.DirectMessages
            .Where(m =>
                (m.SenderUserId == userId && m.ReceiverUserId == otherUserId) ||
                (m.SenderUserId == otherUserId && m.ReceiverUserId == userId))
            .OrderBy(m => m.SentAt)
            .Select(m => new
            {
                m.Id,
                m.SenderUserId,
                m.ReceiverUserId,
                m.Body,
                m.SentAt,
                m.ReadAt,
                Mine = m.SenderUserId == userId
            })
            .ToListAsync();

        var unread = await _context.DirectMessages
            .Where(m => m.SenderUserId == otherUserId && m.ReceiverUserId == userId && m.ReadAt == null)
            .ToListAsync();
        foreach (var m in unread) m.ReadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(messages);
    }

    [HttpPost]
    public async Task<IActionResult> Send([FromBody] SendMessageRequest request)
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized();
        if (!await _context.Users.AnyAsync(u => u.Id == request.ReceiverUserId))
            return NotFound("Receiver not found");

        var message = new DirectMessage
        {
            SenderUserId = userId.Value,
            ReceiverUserId = request.ReceiverUserId,
            Body = request.Body.Trim()
        };
        _context.DirectMessages.Add(message);

        _context.UserNotifications.Add(new UserNotification
        {
            UserId = request.ReceiverUserId,
            Title = "Mesazh i ri",
            Message = message.Body.Length > 120 ? message.Body[..120] + "..." : message.Body,
            Type = "info",
            Link = "/messages"
        });

        await _context.SaveChangesAsync();
        return Ok(new { message = "Sent", id = message.Id, sentAt = message.SentAt });
    }
}

public class SendMessageRequest
{
    public int ReceiverUserId { get; set; }
    [Required, MaxLength(4000)] public string Body { get; set; } = null!;
}
