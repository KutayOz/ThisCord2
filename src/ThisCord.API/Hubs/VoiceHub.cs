using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ThisCord.API.Hubs;

[Authorize]
public class VoiceHub : Hub
{
    private static readonly ConcurrentDictionary<string, string> _userConnections = new();
    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, byte>> _channelParticipants = new();

    private readonly ILogger<VoiceHub> _logger;

    public VoiceHub(ILogger<VoiceHub> logger)
    {
        _logger = logger;
    }

    public override Task OnConnectedAsync()
    {
        var userId = GetCurrentUserId();
        _userConnections[userId] = Context.ConnectionId;
        _logger.LogInformation("User {UserId} connected to VoiceHub", userId);
        return base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetCurrentUserId();
        _userConnections.TryRemove(userId, out _);

        foreach (var kvp in _channelParticipants)
        {
            if (kvp.Value.TryRemove(userId, out _))
            {
                await Clients.Group($"voice:{kvp.Key}").SendAsync("VoiceUserLeft", kvp.Key, userId);
            }

            if (kvp.Value.IsEmpty)
            {
                _channelParticipants.TryRemove(kvp.Key, out _);
            }
        }

        _logger.LogInformation("User {UserId} disconnected from VoiceHub", userId);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinVoiceChannel(Guid channelId)
    {
        var userId = GetCurrentUserId();
        var channelKey = channelId.ToString();

        await Groups.AddToGroupAsync(Context.ConnectionId, $"voice:{channelKey}");

        var participants = _channelParticipants.GetOrAdd(channelKey, _ => new ConcurrentDictionary<string, byte>());
        participants[userId] = 0;

        var existing = participants.Keys.Where(u => u != userId).ToList();
        await Clients.Caller.SendAsync("VoiceParticipants", channelKey, existing);

        await Clients.OthersInGroup($"voice:{channelKey}").SendAsync("VoiceUserJoined", channelKey, userId);
    }

    public async Task LeaveVoiceChannel(Guid channelId)
    {
        var userId = GetCurrentUserId();
        var channelKey = channelId.ToString();

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"voice:{channelKey}");

        if (_channelParticipants.TryGetValue(channelKey, out var participants))
        {
            participants.TryRemove(userId, out _);
            if (participants.IsEmpty)
            {
                _channelParticipants.TryRemove(channelKey, out _);
            }
        }

        await Clients.OthersInGroup($"voice:{channelKey}").SendAsync("VoiceUserLeft", channelKey, userId);
    }

    public async Task SendVoiceOffer(Guid channelId, Guid targetUserId, string sdpOffer)
    {
        var senderId = GetCurrentUserId();
        if (_userConnections.TryGetValue(targetUserId.ToString(), out var targetConnectionId))
        {
            await Clients.Client(targetConnectionId).SendAsync("VoiceReceiveOffer", channelId.ToString(), senderId, sdpOffer);
        }
    }

    public async Task SendVoiceAnswer(Guid channelId, Guid targetUserId, string sdpAnswer)
    {
        var senderId = GetCurrentUserId();
        if (_userConnections.TryGetValue(targetUserId.ToString(), out var targetConnectionId))
        {
            await Clients.Client(targetConnectionId).SendAsync("VoiceReceiveAnswer", channelId.ToString(), senderId, sdpAnswer);
        }
    }

    public async Task SendVoiceIceCandidate(Guid channelId, Guid targetUserId, string iceCandidate)
    {
        var senderId = GetCurrentUserId();
        if (_userConnections.TryGetValue(targetUserId.ToString(), out var targetConnectionId))
        {
            await Clients.Client(targetConnectionId).SendAsync("VoiceReceiveIceCandidate", channelId.ToString(), senderId, iceCandidate);
        }
    }

    private string GetCurrentUserId()
    {
        var userIdClaim = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                          ?? Context.User?.FindFirst("sub")?.Value;
        return userIdClaim!;
    }
}
