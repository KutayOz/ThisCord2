using ThisCord.Domain.Enums;

namespace ThisCord.Application.DTOs;

public record RoleDto(
    Guid Id,
    string Name,
    string? Color,
    int Position,
    bool IsDefault,
    PermissionType Permissions
);

public record CreateRoleRequest(
    string Name,
    string? Color,
    PermissionType Permissions = PermissionType.Default
);

public record UpdateRoleRequest(
    string? Name,
    string? Color,
    int? Position,
    PermissionType? Permissions
);
