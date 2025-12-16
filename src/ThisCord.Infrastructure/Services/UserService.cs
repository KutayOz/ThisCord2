using Microsoft.EntityFrameworkCore;
using ThisCord.Application.Common;
using ThisCord.Application.DTOs;
using ThisCord.Application.Interfaces;
using ThisCord.Domain.Enums;
using ThisCord.Infrastructure.Persistence;

namespace ThisCord.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly ThisCordDbContext _context;

    public UserService(ThisCordDbContext context)
    {
        _context = context;
    }

    public async Task<UserDetailDto?> GetByIdAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        return user?.ToDetailDto();
    }

    public async Task<UserDto?> GetPublicProfileAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        return user?.ToDto();
    }

    public async Task<UserDto?> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) throw new NotFoundException("User", userId);

        if (request.DisplayName != null) user.DisplayName = request.DisplayName;
        if (request.Bio != null) user.Bio = request.Bio;
        if (request.AvatarUrl != null) user.AvatarUrl = request.AvatarUrl;

        await _context.SaveChangesAsync();

        return user.ToDto();
    }

    public async Task<bool> UpdateStatusAsync(Guid userId, PresenceStatus status)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) throw new NotFoundException("User", userId);

        user.Status = status;
        user.LastSeenAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }
}
