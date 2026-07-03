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

    // --- Group chat: one shared thread per TrainingGroup (GroupMessage), not a
    // fan-out of individual DirectMessages — the trainer, its clients, and
    // admin/staff (schedule.write) all read and post into the same thread. ---

    // Groups the current user may read/post in: admin/staff (schedule.write) → all
    // groups; trainer → his own groups; client (or anyone else) → groups they're in.
    private async Task<List<int>> AccessibleGroupIdsAsync(int userId)
    {
        if (User.CanManageCoreScope(permission: "schedule.write"))
            return await _context.TrainingGroups.Select(g => g.Id).ToListAsync();

        if (User.IsInRole(nameof(UserRole.Trainer)))
        {
            var trainerId = await _context.CurrentCoreTrainerIdAsync(User);
            if (trainerId == null) return new List<int>();
            return await _context.TrainingGroups.Where(g => g.TrainerId == trainerId.Value).Select(g => g.Id).ToListAsync();
        }

        return await _context.Clients
            .Where(c => c.UserId == userId)
            .SelectMany(c => c.Groups.Select(g => g.Id))
            .Distinct()
            .ToListAsync();
    }

    private async Task<bool> CanAccessGroupChatAsync(int userId, int groupId)
    {
        var ids = await AccessibleGroupIdsAsync(userId);
        return ids.Contains(groupId);
    }

    // GET: api/messages/groups — every group chat the user can see, with a last-message
    // preview and unread count (unread = messages after their GroupMessageRead pointer).
    [HttpGet("groups")]
    public async Task<IActionResult> Groups()
    {
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();

        var groupIds = await AccessibleGroupIdsAsync(userId.Value);
        if (groupIds.Count == 0) return Ok(Array.Empty<object>());

        var groups = await _context.TrainingGroups
            .Where(g => groupIds.Contains(g.Id))
            .Select(g => new { g.Id, g.Name, MembersCount = g.Clients.Count() })
            .ToListAsync();

        var lastMessages = await _context.GroupMessages
            .Where(m => groupIds.Contains(m.TrainingGroupId))
            .GroupBy(m => m.TrainingGroupId)
            .Select(g => g.OrderByDescending(m => m.SentAt).First())
            .ToListAsync();
        var lastByGroup = lastMessages.ToDictionary(m => m.TrainingGroupId);

        var readRows = await _context.GroupMessageReads
            .Where(r => r.UserId == userId.Value && groupIds.Contains(r.TrainingGroupId))
            .ToListAsync();
        var readByGroup = readRows.ToDictionary(r => r.TrainingGroupId, r => r.LastReadAt);

        var result = new List<object>();
        foreach (var g in groups)
        {
            var since = readByGroup.TryGetValue(g.Id, out var t) ? t : DateTime.MinValue;
            var unread = await _context.GroupMessages.CountAsync(m =>
                m.TrainingGroupId == g.Id && m.SenderUserId != userId.Value && m.SentAt > since);

            lastByGroup.TryGetValue(g.Id, out var last);
            result.Add(new
            {
                groupId = g.Id,
                groupName = g.Name,
                membersCount = g.MembersCount,
                lastMessage = last?.Body,
                sentAt = last?.SentAt,
                unread
            });
        }

        return Ok(result.OrderByDescending(r => ((dynamic)r).sentAt ?? DateTime.MinValue).ToList());
    }

    // GET: api/messages/groups/{groupId}/thread — full thread, marks it read for the caller.
    [HttpGet("groups/{groupId:int}/thread")]
    public async Task<IActionResult> GroupThread(int groupId)
    {
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();
        if (!await CanAccessGroupChatAsync(userId.Value, groupId)) return Forbid();

        var messages = await _context.GroupMessages
            .Where(m => m.TrainingGroupId == groupId)
            .OrderBy(m => m.SentAt)
            .Select(m => new
            {
                m.Id,
                m.SenderUserId,
                SenderName = m.Sender.Name,
                m.Body,
                m.SentAt,
                Mine = m.SenderUserId == userId
            })
            .Take(300)
            .ToListAsync();

        var read = await _context.GroupMessageReads.FirstOrDefaultAsync(r => r.TrainingGroupId == groupId && r.UserId == userId.Value);
        if (read == null)
            _context.GroupMessageReads.Add(new GroupMessageRead { TrainingGroupId = groupId, UserId = userId.Value, LastReadAt = DateTime.UtcNow });
        else
            read.LastReadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(messages);
    }

    // POST: api/messages/groups/{groupId} — post into the shared group thread.
    [HttpPost("groups/{groupId:int}")]
    public async Task<IActionResult> PostToGroup(int groupId, [FromBody] SendGroupMessageRequest request)
    {
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();
        if (!await CanAccessGroupChatAsync(userId.Value, groupId)) return Forbid();

        var group = await _context.TrainingGroups
            .Include(g => g.Clients).ThenInclude(c => c.User)
            .Include(g => g.Trainer).ThenInclude(t => t.User)
            .FirstOrDefaultAsync(g => g.Id == groupId);
        if (group == null) return NotFound(new { message = "Grupi nuk u gjet" });

        var body = request.Body?.Trim();
        if (string.IsNullOrWhiteSpace(body))
            return BadRequest(new { message = "Mesazhi është bosh." });

        var message = new GroupMessage
        {
            TrainingGroupId = groupId,
            SenderUserId = userId.Value,
            Body = body
        };
        _context.GroupMessages.Add(message);

        // Sender's own thread shouldn't show their message as unread.
        var ownRead = await _context.GroupMessageReads.FirstOrDefaultAsync(r => r.TrainingGroupId == groupId && r.UserId == userId.Value);
        if (ownRead == null)
            _context.GroupMessageReads.Add(new GroupMessageRead { TrainingGroupId = groupId, UserId = userId.Value, LastReadAt = message.SentAt });
        else
            ownRead.LastReadAt = message.SentAt;

        var preview = body.Length > 120 ? body[..120] + "..." : body;
        var recipientUserIds = group.Clients
            .Where(c => c.User.IsActive)
            .Select(c => c.UserId)
            .Append(group.Trainer.UserId)
            .Where(uid => uid != userId.Value)
            .Distinct();

        foreach (var uid in recipientUserIds)
        {
            _context.UserNotifications.Add(new UserNotification
            {
                UserId = uid,
                Title = $"Mesazh i ri — {group.Name}",
                Message = preview,
                Type = "info",
                Link = "/messages"
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Sent", id = message.Id, sentAt = message.SentAt, groupId, groupName = group.Name });
    }
}

public class SendMessageRequest
{
    public int ReceiverUserId { get; set; }
    [Required, MaxLength(4000)] public string Body { get; set; } = null!;
}

public class SendGroupMessageRequest
{
    [Required, MaxLength(4000)] public string Body { get; set; } = null!;
}
