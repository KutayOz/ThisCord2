using ThisCord.Domain.Common;

namespace ThisCord.Domain.Entities;

public class Server : SoftDeletableEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public string InviteCode { get; set; } = GenerateInviteCode();
    
    // Owner
    public Guid OwnerId { get; set; }
    public virtual User Owner { get; set; } = null!;
    
    // Navigation properties
    public virtual ICollection<Channel> Channels { get; set; } = new List<Channel>();
    public virtual ICollection<Membership> Memberships { get; set; } = new List<Membership>();
    public virtual ICollection<Role> Roles { get; set; } = new List<Role>();
    
    public void RegenerateInviteCode()
    {
        InviteCode = GenerateInviteCode();
    }
    
    private static string GenerateInviteCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        var random = new Random();
        return new string(Enumerable.Repeat(chars, 8)
            .Select(s => s[random.Next(s.Length)]).ToArray());
    }
}
