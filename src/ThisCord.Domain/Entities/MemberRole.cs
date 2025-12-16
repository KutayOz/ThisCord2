namespace ThisCord.Domain.Entities;

public class MemberRole
{
    public Guid MembershipId { get; set; }
    public virtual Membership Membership { get; set; } = null!;
    
    public Guid RoleId { get; set; }
    public virtual Role Role { get; set; } = null!;
    
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}
