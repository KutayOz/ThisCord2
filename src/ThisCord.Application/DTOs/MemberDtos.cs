namespace ThisCord.Application.DTOs;

public record MemberDto(
    Guid Id,
    UserDto User,
    string? Nickname,
    DateTime JoinedAt,
    List<RoleDto> Roles
);
