using ThisCord.Domain.Common;
using ThisCord.Domain.Enums;

namespace ThisCord.Domain.Entities;

public class Role : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }  // Hex color code
    public int Position { get; set; } = 0;  // Higher = more power
    public bool IsDefault { get; set; } = false;  // Auto-assigned to new members
    
    // Permissions as flags
    public PermissionType Permissions { get; set; } = PermissionType.Default;
    
    // Server reference
    public Guid ServerId { get; set; }
    public virtual Server Server { get; set; } = null!;
    
    // Navigation properties
    public virtual ICollection<MemberRole> MemberRoles { get; set; } = new List<MemberRole>();
    
    public bool HasPermission(PermissionType permission)
    {
        if (Permissions.HasFlag(PermissionType.Administrator))
            return true;
        return Permissions.HasFlag(permission);
    }
}
