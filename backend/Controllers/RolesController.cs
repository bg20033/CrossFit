using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.ComponentModel.DataAnnotations;
using StandUpFitness.Data;
using StandUpFitness.Models;
using StandUpFitness.Services;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/roles")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly FitnessContext _context;
    private readonly IMemoryCache _cache;

    public RolesController(FitnessContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    [Authorize(Policy = "RolesManage")]
    [HttpGet]
    public async Task<IActionResult> GetRoles()
    {
        var roleRows = await _context.DynamicRoles
            .Include(r => r.Permissions)
                .ThenInclude(rp => rp.Permission)
            .AsNoTracking()
            .AsSplitQuery()
            .OrderBy(r => r.Name)
            .ToListAsync();

        var roles = roleRows.Select(r => new
            {
                r.Id,
                r.Key,
                r.Name,
                r.Description,
                r.IsSystem,
                r.IsActive,
                Permissions = r.Permissions.Select(p => p.Permission.Key).OrderBy(k => k).ToList()
            })
            .ToList();

        return Ok(roles);
    }

    [Authorize(Policy = "RolesManage")]
    [HttpGet("permissions")]
    public async Task<IActionResult> GetPermissions()
    {
        await EnsurePermissionCatalogAsync();
        var permissions = await _context.Permissions
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Key)
            .Select(p => new { p.Id, p.Key, p.Module, p.Description })
            .ToListAsync();
        return Ok(permissions);
    }

    [Authorize(Policy = "RolesManage")]
    [HttpGet("users")]
    public async Task<IActionResult> GetUsersWithRoles()
    {
        var users = await _context.Users
            .AsNoTracking()
            .OrderBy(u => u.Name)
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Email,
                BaselineRole = u.Role.ToString()
            })
            .ToListAsync();

        var userIds = users.Select(u => u.Id).ToList();
        var assignments = await _context.UserRoleAssignments
            .AsNoTracking()
            .Where(ur => userIds.Contains(ur.UserId))
            .Select(ur => new AssignedRoleRow(
                ur.UserId,
                ur.DynamicRole.Id,
                ur.DynamicRole.Key,
                ur.DynamicRole.Name))
            .ToListAsync();

        var rolesByUser = assignments
            .GroupBy(a => a.UserId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(a => new AssignedRoleDto(a.Id, a.Key, a.Name))
                    .OrderBy(r => r.Name)
                    .ToList());

        var response = users.Select(u => new
            {
                u.Id,
                u.Name,
                u.Email,
                u.BaselineRole,
                DynamicRoles = rolesByUser.TryGetValue(u.Id, out var assigned)
                    ? assigned
                    : new List<AssignedRoleDto>()
            })
            .ToList();

        return Ok(response);
    }

    [HttpGet("me/permissions")]
    public async Task<IActionResult> MyPermissions()
    {
        var userId = User.CurrentUserId();
        if (userId == null) return Unauthorized();

        var userRole = await _context.Users
            .Where(u => u.Id == userId.Value && u.IsActive)
            .Select(u => u.Role.ToString())
            .FirstOrDefaultAsync();
        if (userRole == null) return Unauthorized();

        var keys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (RbacCatalog.BaselinePermissions.TryGetValue(userRole, out var baseline))
        {
            foreach (var key in baseline) keys.Add(key);
        }

        var dynamicKeys = await _context.UserRoleAssignments
            .Where(ur => ur.UserId == userId && ur.DynamicRole.IsActive)
            .SelectMany(ur => ur.DynamicRole.Permissions.Select(rp => rp.Permission.Key))
            .Distinct()
            .ToListAsync();
        foreach (var key in dynamicKeys) keys.Add(key);

        return Ok(new { permissions = keys.OrderBy(k => k).ToList() });
    }

    [Authorize(Policy = "RolesManage")]
    [HttpPost]
    public async Task<IActionResult> CreateRole([FromBody] RoleRequest request)
    {
        await EnsurePermissionCatalogAsync();
        var key = NormalizeKey(request.Key ?? request.Name);
        if (await _context.DynamicRoles.AnyAsync(r => r.Key == key))
            return BadRequest(new { message = "Role key already exists" });

        var role = new DynamicRole
        {
            Key = key,
            Name = request.Name.Trim(),
            Description = request.Description ?? "",
            IsSystem = false,
            IsActive = true
        };

        _context.DynamicRoles.Add(role);
        await _context.SaveChangesAsync();
        await ReplacePermissionsAsync(role.Id, request.PermissionKeys);
        return Ok(new { message = "Role created", id = role.Id, key = role.Key });
    }

    [Authorize(Policy = "RolesManage")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] RoleRequest request)
    {
        var role = await _context.DynamicRoles.FindAsync(id);
        if (role == null) return NotFound();
        if (role.IsSystem && request.IsActive == false)
            return BadRequest(new { message = "System roles cannot be disabled" });

        role.Name = request.Name.Trim();
        role.Description = request.Description ?? role.Description;
        role.IsActive = request.IsActive ?? role.IsActive;
        role.UpdatedAt = DateTime.UtcNow;
        await ReplacePermissionsAsync(role.Id, request.PermissionKeys);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Role updated" });
    }

    [Authorize(Policy = "RolesManage")]
    [HttpPost("{id:int}/assign")]
    public async Task<IActionResult> AssignRole(int id, [FromBody] AssignRoleRequest request)
    {
        if (!await _context.DynamicRoles.AnyAsync(r => r.Id == id && r.IsActive))
            return NotFound("Role not found");
        if (!await _context.Users.AnyAsync(u => u.Id == request.UserId))
            return NotFound("User not found");

        var exists = await _context.UserRoleAssignments.AnyAsync(ur => ur.UserId == request.UserId && ur.DynamicRoleId == id);
        if (!exists)
        {
            _context.UserRoleAssignments.Add(new UserRoleAssignment { UserId = request.UserId, DynamicRoleId = id });
            await _context.SaveChangesAsync();
            // Evict the cached permission set so the change applies on the next request.
            _cache.Remove($"{PermissionClaimsTransformation.CacheKeyPrefix}{request.UserId}");
        }
        return Ok(new { message = "Role assigned" });
    }

    [Authorize(Policy = "RolesManage")]
    [HttpDelete("{id:int}/assign/{userId:int}")]
    public async Task<IActionResult> UnassignRole(int id, int userId)
    {
        var row = await _context.UserRoleAssignments.FindAsync(userId, id);
        if (row == null) return NotFound();
        _context.UserRoleAssignments.Remove(row);
        await _context.SaveChangesAsync();
        _cache.Remove($"{PermissionClaimsTransformation.CacheKeyPrefix}{userId}");
        return Ok(new { message = "Role removed from user" });
    }

    private async Task ReplacePermissionsAsync(int roleId, IEnumerable<string>? keys)
    {
        var requested = (keys ?? Array.Empty<string>()).Select(NormalizeKey).ToHashSet();
        var existing = await _context.RolePermissions.Where(rp => rp.DynamicRoleId == roleId).ToListAsync();
        _context.RolePermissions.RemoveRange(existing);

        var permissions = await _context.Permissions.Where(p => requested.Contains(p.Key)).ToListAsync();
        foreach (var p in permissions)
            _context.RolePermissions.Add(new RolePermission { DynamicRoleId = roleId, PermissionId = p.Id });
    }

    private async Task EnsurePermissionCatalogAsync()
    {
        var existing = await _context.Permissions.Select(p => p.Key).ToListAsync();
        foreach (var item in RbacCatalog.Permissions.Where(c => !existing.Contains(c.Key)))
        {
            _context.Permissions.Add(new Permission { Key = item.Key, Module = item.Module, Description = item.Description });
        }
        await _context.SaveChangesAsync();
    }

    private static string NormalizeKey(string raw) =>
        raw.Trim().ToLowerInvariant().Replace(" ", "_").Replace("-", "_");

    private sealed record AssignedRoleRow(int UserId, int Id, string Key, string Name);
    private sealed record AssignedRoleDto(int Id, string Key, string Name);
}

public class RoleRequest
{
    public string? Key { get; set; }
    [Required, MaxLength(120)] public string Name { get; set; } = null!;
    [MaxLength(500)] public string? Description { get; set; }
    public bool? IsActive { get; set; }
    public IEnumerable<string>? PermissionKeys { get; set; }
}

public class AssignRoleRequest
{
    public int UserId { get; set; }
}
