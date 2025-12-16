using ThisCord.Domain.Common;
using ThisCord.Domain.Enums;

namespace ThisCord.Domain.Entities;

public class Channel : SoftDeletableEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Topic { get; set; }
    public ChannelType Type { get; set; } = ChannelType.Text;
    public int Position { get; set; } = 0;
    
    // Server reference
    public Guid ServerId { get; set; }
    public virtual Server Server { get; set; } = null!;
    
    // Navigation properties
    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();
}
