using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using StandUpFitness.Data;
using StandUpFitness.Models;
using StandUpFitness.Services;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/messages")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly FitnessContext _context;
    private static readonly UserRole[] StaffContactRoles =
        [UserRole.Admin, UserRole.GymOwner, UserRole.Staff, UserRole.Cashier];

    public MessagesController(FitnessContext context)
    {
        _context = context;
    }

    private async Task<IQueryable<User>> ContactQueryAsync(int userId)
    {
        var baseQuery = _context.Users.Where(u => u.Id != userId && u.IsActive);

        if (User.CanManageCoreScope(includeStaff: true, includeCashier: true))
            return baseQuery;

        if (User.IsInRole(nameof(UserRole.Trainer)))
        {
            var trainerId = await _context.CurrentCoreTrainerIdAsync(User);
            if (trainerId == null) return baseQuery.Where(_ => false);

            return baseQuery.Where(u =>
                StaffContactRoles.Contains(u.Role) ||
                _context.Clients.Any(c =>
                    c.UserId == u.Id &&
                    (c.TrainerId == trainerId.Value || c.Groups.Any(g => g.TrainerId == trainerId.Value))));
        }

        if (User.IsInRole(nameof(UserRole.Client)))
        {
            var directTrainerUserIds = await _context.Clients
                .Where(c => c.UserId == userId && c.TrainerId != null)
                .Select(c => c.Trainer!.UserId)
                .ToListAsync();
            var groupTrainerUserIds = await _context.Clients
                .Where(c => c.UserId == userId)
                .SelectMany(c => c.Groups.Select(g => g.Trainer.UserId))
                .ToListAsync();
            var trainerUserIds = directTrainerUserIds.Concat(groupTrainerUserIds).Distinct().ToArray();

            return baseQuery.Where(u => StaffContactRoles.Contains(u.Role) || trainerUserIds.Contains(u.Id));
        }

        if (User.IsInRole(nameof(UserRole.TrainerTenant)))
        {
            var tenantId = await _context.TrainerTenants
                .Where(t => t.UserId == userId)
                .Select(t => (int?)t.Id)
                .FirstOrDefaultAsync();
            if (tenantId == null) return baseQuery.Where(_ => false);

            return baseQuery.Where(u =>
                StaffContactRoles.Contains(u.Role) ||
                _context.TenantClients.Any(c => c.TrainerTenantId == tenantId.Value && c.UserId == u.Id));
        }

        if (User.IsInRole(nameof(UserRole.TenantClient)))
        {
            var tenantTrainerUserId = await _context.TenantClients
                .Where(c => c.UserId == userId)
                .Select(c => (int?)c.TrainerTenant.UserId)
                .FirstOrDefaultAsync();

            return baseQuery.Where(u =>
                StaffContactRoles.Contains(u.Role) ||
                (tenantTrainerUserId != null && u.Id == tenantTrainerUserId.Value));
        }

        return baseQuery.Where(u => StaffContactRoles.Contains(u.Role));
    }

    private async Task<bool> CanMessageUserAsync(int userId, int otherUserId)
    {
        if (userId == otherUserId) return false;
        var query = await ContactQueryAsync(userId);
        return await query.AnyAsync(u => u.Id == otherUserId);
    }

    [HttpGet("inbox")]
    public async Task<IActionResult> Inbox()
    {
        var userId = User.CurrentUserId();
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
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();

        var query = await ContactQueryAsync(userId.Value);

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
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();
        if (!await CanMessageUserAsync(userId.Value, otherUserId)) return Forbid();

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
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();
        if (!await CanMessageUserAsync(userId.Value, request.ReceiverUserId))
            return Forbid();

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
