using ThisCord.Domain.Common;
using ThisCord.Domain.Enums;

namespace ThisCord.Domain.Entities;

public class FriendRequest : BaseEntity
{
    public Guid RequesterId { get; set; }
    public virtual User Requester { get; set; } = null!;

    public Guid AddresseeId { get; set; }
    public virtual User Addressee { get; set; } = null!;

    public FriendRequestStatus Status { get; set; } = FriendRequestStatus.Pending;
    public DateTime? RespondedAt { get; set; }
}
