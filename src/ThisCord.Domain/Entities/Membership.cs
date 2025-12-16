using ThisCord.Domain.Common;

namespace ThisCord.Domain.Entities;

public class Membership : BaseEntity
{
    public Guid UserId { get; set; }
    public virtual User User { get; set; } = null!;
    
    public Guid ServerId { get; set; }
    public virtual Server Server { get; set; } = null!;
    
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public string? Nickname { get; set; }
    
    // Navigation properties
    public virtual ICollection<MemberRole> MemberRoles { get; set; } = new List<MemberRole>();
}
