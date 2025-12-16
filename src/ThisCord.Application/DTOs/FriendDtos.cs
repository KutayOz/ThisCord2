using ThisCord.Domain.Enums;

namespace ThisCord.Application.DTOs;

public record FriendRequestDto(
    Guid Id,
    UserDto Requester,
    UserDto Addressee,
    FriendRequestStatus Status,
    DateTime CreatedAt,
    DateTime? RespondedAt
);

public record CreateFriendRequestRequest(string UsernameOrEmail);
