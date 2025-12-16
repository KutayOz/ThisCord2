using ThisCord.Domain.Enums;

namespace ThisCord.Application.DTOs;

public record UserDto(
    Guid Id,
    string Username,
    string? DisplayName,
    string? AvatarUrl,
    string? Bio,
    PresenceStatus Status
);

public record UserDetailDto(
    Guid Id,
    string Username,
    string Email,
    string? DisplayName,
    string? AvatarUrl,
    string? Bio,
    PresenceStatus Status,
    DateTime CreatedAt,
    DateTime? LastSeenAt
);

public record UpdateProfileRequest(
    string? DisplayName,
    string? Bio,
    string? AvatarUrl
);

public record UpdateStatusRequest(PresenceStatus Status);
