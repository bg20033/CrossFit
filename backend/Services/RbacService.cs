using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Services;

public static class RbacCatalog
{
    public static readonly (string Key, string Module, string Description)[] Permissions =
    {
        ("system.admin", "system", "Qasje e plotë administrative"),
        ("roles.manage", "system", "Menaxho role dhe permissions"),
        ("clients.read", "clients", "Shiko klientët"),
        ("clients.write", "clients", "Krijo dhe ndrysho klientët"),
        ("trainers.write", "trainers", "Menaxho trajnerët"),
        ("staff.write", "staff", "Menaxho stafin"),
        ("finance.read", "finance", "Shiko financat"),
        ("finance.write", "finance", "Regjistro pagesa dhe shpenzime"),
        ("schedule.write", "schedule", "Menaxho oraret dhe grupet"),
        ("access.scan", "access", "Skano QR dhe regjistro hyrje/dalje"),
        ("nutrition.write", "nutrition", "Krijo plane ushqimi"),
        ("workouts.write", "workouts", "Krijo plane ushtrimesh"),
        ("rental.manage", "rental", "Menaxho qiranë dhe slotet"),
        ("reports.read", "reports", "Shiko raportet")
    };

    public static readonly Dictionary<string, string[]> BaselinePermissions = new()
    {
        ["Admin"] = Permissions.Select(p => p.Key).ToArray(),
        ["GymOwner"] = Permissions.Select(p => p.Key).ToArray(),
        ["Staff"] = new[] { "clients.read", "clients.write", "finance.write", "access.scan" },
        ["Cashier"] = new[] { "clients.read", "clients.write", "finance.write", "access.scan" },
        ["Trainer"] = new[] { "clients.read", "schedule.write", "nutrition.write", "workouts.write", "reports.read" },
        ["TrainerTenant"] = new[] { "rental.manage", "nutrition.write", "workouts.write", "reports.read" },
        ["Client"] = Array.Empty<string>(),
        ["TenantClient"] = Array.Empty<string>()
    };

    // Display name shown in the admin roles UI. The underlying enum/DB key
    // (e.g. "TrainerTenant") is unchanged for compatibility — only the label
    // a person sees is "Qiragji" (a rental trainer who runs their own micro-gym
    // space inside the gym: schedule + nutrition + workouts like a Trainer,
    // plus their own clients and rent billing).
    public static readonly Dictionary<string, string> DisplayNames = new()
    {
        ["TrainerTenant"] = "Qiragji",
    };

    public static string DisplayNameFor(string roleKey) =>
        DisplayNames.TryGetValue(roleKey, out var name) ? name : roleKey;
}

public class PermissionClaimsTransformation : IClaimsTransformation
{
    private readonly FitnessContext _context;

    public PermissionClaimsTransformation(FitnessContext context)
    {
        _context = context;
    }

    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity is not ClaimsIdentity identity || !identity.IsAuthenticated)
            return principal;
        if (principal.HasClaim(c => c.Type == "permissions_loaded"))
            return principal;

        var permissions = new HashSet<string>();
        foreach (var roleClaim in principal.FindAll("role").Select(c => c.Value))
        {
            if (RbacCatalog.BaselinePermissions.TryGetValue(roleClaim, out var keys))
            {
                foreach (var key in keys) permissions.Add(key);
            }
        }

        var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out var userId))
        {
            var dynamicPermissions = await _context.UserRoleAssignments
                .Where(ur => ur.UserId == userId && ur.DynamicRole.IsActive)
                .SelectMany(ur => ur.DynamicRole.Permissions.Select(rp => rp.Permission.Key))
                .Distinct()
                .ToListAsync();
            foreach (var key in dynamicPermissions) permissions.Add(key);
        }

        foreach (var permission in permissions)
            identity.AddClaim(new Claim("permission", permission));
        identity.AddClaim(new Claim("permissions_loaded", "true"));
        return principal;
    }
}

public static class RbacSeeder
{
    public static async Task SeedAsync(FitnessContext context)
    {
        var existingPermissions = await context.Permissions.Select(p => p.Key).ToListAsync();
        foreach (var item in RbacCatalog.Permissions.Where(p => !existingPermissions.Contains(p.Key)))
        {
            context.Permissions.Add(new Permission { Key = item.Key, Module = item.Module, Description = item.Description });
        }
        await context.SaveChangesAsync();

        foreach (var role in RbacCatalog.BaselinePermissions)
        {
            var key = role.Key.ToLowerInvariant();
            var displayName = RbacCatalog.DisplayNameFor(role.Key);
            var dbRole = await context.DynamicRoles
                .Include(r => r.Permissions)
                .FirstOrDefaultAsync(r => r.Key == key);
            if (dbRole == null)
            {
                dbRole = new DynamicRole
                {
                    Key = key,
                    Name = displayName,
                    Description = "System baseline role",
                    IsSystem = true,
                    IsActive = true
                };
                context.DynamicRoles.Add(dbRole);
                await context.SaveChangesAsync();
            }
            else if (dbRole.IsSystem && dbRole.Name != displayName)
            {
                // Keep the seeded display name in sync (e.g. TrainerTenant -> "Qiragji")
                // without touching anything an admin may have customized on a non-system role.
                dbRole.Name = displayName;
                dbRole.UpdatedAt = DateTime.UtcNow;
                await context.SaveChangesAsync();
            }

            var current = await context.RolePermissions
                .Where(rp => rp.DynamicRoleId == dbRole.Id)
                .Select(rp => rp.Permission.Key)
                .ToListAsync();
            var missing = role.Value.Except(current).ToList();
            if (missing.Count == 0) continue;

            var permissionRows = await context.Permissions.Where(p => missing.Contains(p.Key)).ToListAsync();
            foreach (var permission in permissionRows)
            {
                context.RolePermissions.Add(new RolePermission
                {
                    DynamicRoleId = dbRole.Id,
                    PermissionId = permission.Id
                });
            }
            await context.SaveChangesAsync();
        }
    }
}
