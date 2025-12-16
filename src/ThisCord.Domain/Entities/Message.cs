using ThisCord.Domain.Common;

namespace ThisCord.Domain.Entities;

public class Message : SoftDeletableEntity
{
    public string? Content { get; set; }
    public DateTime? EditedAt { get; set; }
    
    // Author
    public Guid AuthorId { get; set; }
    public virtual User Author { get; set; } = null!;
    
    // Channel
    public Guid ChannelId { get; set; }
    public virtual Channel Channel { get; set; } = null!;
    
    // Reply reference
    public Guid? ReplyToId { get; set; }
    public virtual Message? ReplyTo { get; set; }
    
    // Navigation properties
    public virtual ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
}
