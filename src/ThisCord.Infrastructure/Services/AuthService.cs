using Microsoft.EntityFrameworkCore;
using ThisCord.Application.Common;
using ThisCord.Application.DTOs;
using ThisCord.Application.Interfaces;
using ThisCord.Domain.Entities;
using ThisCord.Domain.Enums;
using ThisCord.Infrastructure.Persistence;

namespace ThisCord.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly ThisCordDbContext _context;
    private readonly ITokenService _tokenService;

    public AuthService(ThisCordDbContext context, ITokenService tokenService)
    {
        _context = context;
        _tokenService = tokenService;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        // Check if username or email already exists
        var existingUser = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == request.Email || u.Username == request.Username);

        if (existingUser != null)
        {
            if (existingUser.Email == request.Email)
                throw new ConflictException("Email is already registered.");
            throw new ConflictException("Username is already taken.");
        }

        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Status = PresenceStatus.Online
        };

        var refreshToken = _tokenService.GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var accessToken = _tokenService.GenerateAccessToken(user);

        return new AuthResponse(accessToken, refreshToken, user.ToDto());
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException("Invalid email or password.");

        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        user.Status = PresenceStatus.Online;
        user.LastSeenAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new AuthResponse(accessToken, refreshToken, user.ToDto());
    }

    public async Task<TokenResponse> RefreshTokenAsync(string refreshToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);

        if (user == null || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
            throw new UnauthorizedException("Invalid or expired refresh token.");

        var newAccessToken = _tokenService.GenerateAccessToken(user);
        var newRefreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

        await _context.SaveChangesAsync();

        return new TokenResponse(newAccessToken, newRefreshToken);
    }

    public async Task RevokeRefreshTokenAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return;

        user.RefreshToken = null;
        user.RefreshTokenExpiryTime = null;
        user.Status = PresenceStatus.Offline;

        await _context.SaveChangesAsync();
    }
}
