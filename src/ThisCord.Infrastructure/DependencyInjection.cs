using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ThisCord.Application.Interfaces;
using ThisCord.Infrastructure.Persistence;
using ThisCord.Infrastructure.Services;

namespace ThisCord.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Database
        services.AddDbContext<ThisCordDbContext>(options =>
            options.UseNpgsql(
                configuration.GetConnectionString("Database"),
                b => b.MigrationsAssembly(typeof(ThisCordDbContext).Assembly.FullName)));

        // Services
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IServerService, ServerService>();
        services.AddScoped<IChannelService, ChannelService>();
        services.AddScoped<IMessageService, MessageService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IFriendService, FriendService>();

        return services;
    }
}
