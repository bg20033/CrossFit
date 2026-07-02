using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Services;

public static class UserAccess
{
    public static int? CurrentUserId(this ClaimsPrincipal user)
    {
        var claim = user.FindFirst(ClaimTypes.NameIdentifier);
        return int.TryParse(claim?.Value, out var id) ? id : null;
    }

    public static bool HasAnyRole(this ClaimsPrincipal user, params string[] roles) =>
        roles.Any(user.IsInRole);

    public static bool HasAnyPermission(this ClaimsPrincipal user, params string[] permissions) =>
        permissions.Any(permission => user.HasClaim("permission", permission));

    public static bool IsTenantRole(this ClaimsPrincipal user) =>
        user.IsInRole(nameof(UserRole.TrainerTenant)) || user.IsInRole(nameof(UserRole.TenantClient));

    public static bool IsAdminOrOwner(this ClaimsPrincipal user) =>
        user.HasAnyRole(nameof(UserRole.Admin), nameof(UserRole.GymOwner)) ||
        user.HasAnyPermission("system.admin");

    public static bool CanManageCoreScope(
        this ClaimsPrincipal user,
        bool includeStaff = false,
        bool includeCashier = false,
        string? permission = null,
        bool permissionAppliesToTrainer = false)
    {
        if (user.IsTenantRole()) return false;
        if (user.IsAdminOrOwner()) return true;
        if (includeStaff && user.IsInRole(nameof(UserRole.Staff))) return true;
        if (includeCashier && user.IsInRole(nameof(UserRole.Cashier))) return true;
        return !string.IsNullOrWhiteSpace(permission) &&
            (permissionAppliesToTrainer || !user.IsInRole(nameof(UserRole.Trainer))) &&
            user.HasAnyPermission(permission);
    }

    public static async Task<int?> CurrentCoreTrainerIdAsync(this FitnessContext context, ClaimsPrincipal user)
    {
        var userId = user.CurrentUserId();
        if (userId == null) return null;

        return await context.Trainers
            .Where(t => t.UserId == userId && t.User.Role == UserRole.Trainer)
            .Select(t => (int?)t.Id)
            .FirstOrDefaultAsync();
    }

    public static async Task<int?> OwnClientIdAsync(this FitnessContext context, ClaimsPrincipal user)
    {
        var userId = user.CurrentUserId();
        if (userId == null) return null;

        return await context.Clients
            .Where(c => c.UserId == userId.Value)
            .Select(c => (int?)c.Id)
            .FirstOrDefaultAsync();
    }

    public static async Task<bool> TrainerCanAccessClientAsync(
        this FitnessContext context,
        ClaimsPrincipal user,
        int clientId,
        bool includeGroupClients = true)
    {
        var trainerId = await context.CurrentCoreTrainerIdAsync(user);
        if (trainerId == null) return false;

        var query = context.Clients.Where(c => c.Id == clientId);
        return includeGroupClients
            ? await query.AnyAsync(c => c.TrainerId == trainerId.Value || c.Groups.Any(g => g.TrainerId == trainerId.Value))
            : await query.AnyAsync(c => c.TrainerId == trainerId.Value);
    }

    public static async Task<bool> CanAccessCoreTrainerAsync(
        this FitnessContext context,
        ClaimsPrincipal user,
        int trainerId,
        string? managerPermission = null)
    {
        if (user.CanManageCoreScope(permission: managerPermission))
            return true;

        return await context.CurrentCoreTrainerIdAsync(user) == trainerId;
    }

    public static async Task<bool> CanAccessCoreClientAsync(
        this FitnessContext context,
        ClaimsPrincipal user,
        int clientId,
        bool includeStaff = true,
        bool includeCashier = false,
        string? managerPermission = null,
        bool managerPermissionAppliesToTrainer = false,
        bool includeTrainerGroupClients = true)
    {
        if (user.CanManageCoreScope(includeStaff, includeCashier, managerPermission, managerPermissionAppliesToTrainer))
            return true;
        if (user.IsInRole(nameof(UserRole.Trainer)))
            return await context.TrainerCanAccessClientAsync(user, clientId, includeTrainerGroupClients);

        var own = await context.OwnClientIdAsync(user);
        return own == clientId;
    }

    public static async Task<bool> CanAccessCoreGroupAsync(
        this FitnessContext context,
        ClaimsPrincipal user,
        int groupId,
        string? managerPermission = "schedule.write")
    {
        if (user.CanManageCoreScope(permission: managerPermission))
            return true;

        var trainerId = await context.CurrentCoreTrainerIdAsync(user);
        if (trainerId == null) return false;

        return await context.TrainingGroups.AnyAsync(g => g.Id == groupId && g.TrainerId == trainerId.Value);
    }
}
