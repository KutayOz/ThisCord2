namespace ThisCord.Application.DTOs;

public record ServerDto(
    Guid Id,
    string Name,
    string? Description,
    string? IconUrl,
    Guid OwnerId,
    string InviteCode,
    int MemberCount,
    DateTime CreatedAt
);

public record ServerDetailDto(
    Guid Id,
    string Name,
    string? Description,
    string? IconUrl,
    Guid OwnerId,
    UserDto Owner,
    string InviteCode,
    int MemberCount,
    DateTime CreatedAt,
    List<ChannelDto> Channels,
    List<RoleDto> Roles
);

public record CreateServerRequest(
    string Name,
    string? Description,
    string? IconUrl
);

public record UpdateServerRequest(
    string? Name,
    string? Description,
    string? IconUrl
);
