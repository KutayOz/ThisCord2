using ThisCord.Domain.Common;

namespace ThisCord.Domain.Entities;

public class Attachment : BaseEntity
{
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string ContentType { get; set; } = string.Empty;
    
    // Message reference
    public Guid MessageId { get; set; }
    public virtual Message Message { get; set; } = null!;
}
