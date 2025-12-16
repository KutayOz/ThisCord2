using ThisCord.Domain.Common;
using ThisCord.Domain.Enums;

namespace ThisCord.Domain.Entities;

public class User : SoftDeletableEntity
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime? LastSeenAt { get; set; }
    
    // Profile information (embedded for simplicity)
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public PresenceStatus Status { get; set; } = PresenceStatus.Offline;
    
    // Refresh token for auth
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }
    
    // Navigation properties
    public virtual ICollection<Membership> Memberships { get; set; } = new List<Membership>();
    public virtual ICollection<Server> OwnedServers { get; set; } = new List<Server>();
    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();
}
