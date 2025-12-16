using ThisCord.Application.DTOs;
using ThisCord.Domain.Enums;

namespace ThisCord.Application.Interfaces;

public interface IUserService
{
    Task<UserDetailDto?> GetByIdAsync(Guid userId);
    Task<UserDto?> GetPublicProfileAsync(Guid userId);
    Task<UserDto?> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);
    Task<bool> UpdateStatusAsync(Guid userId, PresenceStatus status);
}
