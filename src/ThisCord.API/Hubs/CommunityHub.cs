using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using ThisCord.Application.DTOs;
using ThisCord.Application.Interfaces;
using ThisCord.Domain.Enums;

namespace ThisCord.API.Hubs;

[Authorize]
public class CommunityHub : Hub
{
    private readonly IServerService _serverService;
    private readonly IUserService _userService;
    private readonly ILogger<CommunityHub> _logger;

    public CommunityHub(
        IServerService serverService,
        IUserService userService,
        ILogger<CommunityHub> logger)
    {
        _serverService = serverService;
        _userService = userService;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetCurrentUserId();
        _logger.LogInformation("User {UserId} connected to CommunityHub", userId);

        // Update user status to online
        await _userService.UpdateStatusAsync(userId, PresenceStatus.Online);

        // Join user's server groups
        var servers = await _serverService.GetUserServersAsync(userId);
        foreach (var server in servers)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"server:{server.Id}");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetCurrentUserId();
        _logger.LogInformation("User {UserId} disconnected from CommunityHub", userId);

        // Update user status to offline
        await _userService.UpdateStatusAsync(userId, PresenceStatus.Offline);

        await base.OnDisconnectedAsync(exception);
    }

    // Channel subscription
    public async Task JoinChannel(Guid channelId)
    {
        var userId = GetCurrentUserId();
        _logger.LogInformation("User {UserId} joining channel {ChannelId}", userId, channelId);

        await Groups.AddToGroupAsync(Context.ConnectionId, $"channel:{channelId}");
    }

    public async Task LeaveChannel(Guid channelId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"channel:{channelId}");
    }

    // Typing indicators
    public async Task StartTyping(Guid channelId)
    {
        var userId = GetCurrentUserId();
        await Clients.Group($"channel:{channelId}")
            .SendAsync("UserTyping", userId, channelId);
    }

    public async Task StopTyping(Guid channelId)
    {
        var userId = GetCurrentUserId();
        await Clients.Group($"channel:{channelId}")
            .SendAsync("UserStoppedTyping", userId, channelId);
    }

    // Presence updates
    public async Task UpdatePresence(PresenceStatus status)
    {
        var userId = GetCurrentUserId();
        await _userService.UpdateStatusAsync(userId, status);

        // Broadcast to all servers user is in
        var servers = await _serverService.GetUserServersAsync(userId);
        foreach (var server in servers)
        {
            await Clients.Group($"server:{server.Id}")
                .SendAsync("PresenceUpdated", userId, status);
        }
    }

    // Server methods called from controllers to broadcast messages
    public static async Task BroadcastNewMessage(IHubContext<CommunityHub> hubContext, Guid channelId, MessageDto message)
    {
        await hubContext.Clients.Group($"channel:{channelId}")
            .SendAsync("ReceiveMessage", message);
    }

    public static async Task BroadcastMessageUpdated(IHubContext<CommunityHub> hubContext, Guid channelId, MessageDto message)
    {
        await hubContext.Clients.Group($"channel:{channelId}")
            .SendAsync("MessageUpdated", message);
    }

    public static async Task BroadcastMessageDeleted(IHubContext<CommunityHub> hubContext, Guid channelId, Guid messageId)
    {
        await hubContext.Clients.Group($"channel:{channelId}")
            .SendAsync("MessageDeleted", new { messageId, channelId });
    }

    public static async Task BroadcastMemberJoined(IHubContext<CommunityHub> hubContext, Guid serverId, MemberDto member)
    {
        await hubContext.Clients.Group($"server:{serverId}")
            .SendAsync("MemberJoined", serverId, member);
    }

    public static async Task BroadcastMemberLeft(IHubContext<CommunityHub> hubContext, Guid serverId, Guid userId)
    {
        await hubContext.Clients.Group($"server:{serverId}")
            .SendAsync("MemberLeft", serverId, userId);
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                          ?? Context.User?.FindFirst("sub")?.Value;
        return Guid.Parse(userIdClaim!);
    }
}
