namespace StandUpFitness.Models;

public class DynamicRole
{
    public int Id { get; set; }
    public string Key { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
    public bool IsSystem { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<RolePermission> Permissions { get; set; } = new List<RolePermission>();
    public ICollection<UserRoleAssignment> Users { get; set; } = new List<UserRoleAssignment>();
}

public class Permission
{
    public int Id { get; set; }
    public string Key { get; set; } = null!;
    public string Module { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<RolePermission> Roles { get; set; } = new List<RolePermission>();
}

public class RolePermission
{
    public int DynamicRoleId { get; set; }
    public int PermissionId { get; set; }

    public DynamicRole DynamicRole { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
}

public class UserRoleAssignment
{
    public int UserId { get; set; }
    public int DynamicRoleId { get; set; }
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public DynamicRole DynamicRole { get; set; } = null!;
}
