using ThisCord.Application.DTOs;
using ThisCord.Domain.Entities;

namespace ThisCord.Application.Common;

public static class MappingExtensions
{
    public static UserDto ToDto(this User user) => new(
        user.Id,
        user.Username,
        user.DisplayName,
        user.AvatarUrl,
        user.Bio,
        user.Status
    );

    public static UserDetailDto ToDetailDto(this User user) => new(
        user.Id,
        user.Username,
        user.Email,
        user.DisplayName,
        user.AvatarUrl,
        user.Bio,
        user.Status,
        user.CreatedAt,
        user.LastSeenAt
    );

    public static ServerDto ToDto(this Server server) => new(
        server.Id,
        server.Name,
        server.Description,
        server.IconUrl,
        server.OwnerId,
        server.InviteCode,
        server.Memberships.Count,
        server.CreatedAt
    );

    public static ServerDetailDto ToDetailDto(this Server server) => new(
        server.Id,
        server.Name,
        server.Description,
        server.IconUrl,
        server.OwnerId,
        server.Owner.ToDto(),
        server.InviteCode,
        server.Memberships.Count,
        server.CreatedAt,
        server.Channels.Select(c => c.ToDto()).ToList(),
        server.Roles.Select(r => r.ToDto()).ToList()
    );

    public static FriendRequestDto ToDto(this FriendRequest request) => new(
        request.Id,
        request.Requester.ToDto(),
        request.Addressee.ToDto(),
        request.Status,
        request.CreatedAt,
        request.RespondedAt
    );

    public static ChannelDto ToDto(this Channel channel) => new(
        channel.Id,
        channel.ServerId,
        channel.Name,
        channel.Topic,
        channel.Type,
        channel.Position
    );

    public static MessageDto ToDto(this Message message) => new(
        message.Id,
        message.ChannelId,
        message.Author.ToDto(),
        message.Content,
        message.CreatedAt,
        message.EditedAt,
        message.ReplyToId,
        message.Attachments.Select(a => a.ToDto()).ToList()
    );

    public static AttachmentDto ToDto(this Attachment attachment) => new(
        attachment.Id,
        attachment.FileName,
        attachment.FileUrl,
        attachment.FileSize,
        attachment.ContentType
    );

    public static RoleDto ToDto(this Role role) => new(
        role.Id,
        role.Name,
        role.Color,
        role.Position,
        role.IsDefault,
        role.Permissions
    );

    public static MemberDto ToDto(this Membership membership) => new(
        membership.Id,
        membership.User.ToDto(),
        membership.Nickname,
        membership.JoinedAt,
        membership.MemberRoles.Select(mr => mr.Role.ToDto()).ToList()
    );
}
