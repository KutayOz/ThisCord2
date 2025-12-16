using ThisCord.Application.DTOs;

namespace ThisCord.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<TokenResponse> RefreshTokenAsync(string refreshToken);
    Task RevokeRefreshTokenAsync(Guid userId);
}
