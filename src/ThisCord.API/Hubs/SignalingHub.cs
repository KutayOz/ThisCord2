using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ThisCord.API.Hubs;

/// <summary>
/// WebRTC signaling hub for P2P DM sessions.
/// This hub ONLY relays signaling data - NO message content is ever processed or logged.
/// </summary>
[Authorize]
public class SignalingHub : Hub
{
    // Thread-safe mapping of userId -> connectionId
    private static readonly ConcurrentDictionary<string, string> _userConnections = new();
    private readonly ILogger<SignalingHub> _logger;

    public SignalingHub(ILogger<SignalingHub> logger)
    {
        _logger = logger;
    }

    public override Task OnConnectedAsync()
    {
        var userId = GetCurrentUserId();
        _userConnections[userId] = Context.ConnectionId;

        _logger.LogInformation("User {UserId} connected to SignalingHub", userId);

        return base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetCurrentUserId();
        _userConnections.TryRemove(userId, out _);

        _logger.LogInformation("User {UserId} disconnected from SignalingHub", userId);

        // Notify any active DM peers about disconnection
        await Clients.All.SendAsync("PeerDisconnected", userId);

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Request a DM session with another user.
    /// </summary>
    public async Task RequestDMSession(Guid targetUserId)
    {
        var requesterId = GetCurrentUserId();

        // Log action but NOT content (privacy-preserving)
        _logger.LogInformation("DM session requested: {RequesterId} -> {TargetId}", requesterId, targetUserId);

        if (!_userConnections.TryGetValue(targetUserId.ToString(), out var targetConnectionId))
        {
            await Clients.Caller.SendAsync("DMSessionError", "User is offline");
            return;
        }

        await Clients.Client(targetConnectionId)
            .SendAsync("DMSessionRequest", requesterId);
    }

    /// <summary>
    /// Accept a DM session request.
    /// </summary>
    public async Task AcceptDMSession(Guid requesterId)
    {
        var accepterId = GetCurrentUserId();
        _logger.LogInformation("DM session accepted: {AccepterId} accepts {RequesterId}", accepterId, requesterId);

        if (_userConnections.TryGetValue(requesterId.ToString(), out var requesterConnectionId))
        {
            await Clients.Client(requesterConnectionId)
                .SendAsync("DMSessionAccepted", accepterId);
        }
    }

    /// <summary>
    /// Reject a DM session request.
    /// </summary>
    public async Task RejectDMSession(Guid requesterId)
    {
        var rejecterId = GetCurrentUserId();
        _logger.LogInformation("DM session rejected: {RejecterId} rejects {RequesterId}", rejecterId, requesterId);

        if (_userConnections.TryGetValue(requesterId.ToString(), out var requesterConnectionId))
        {
            await Clients.Client(requesterConnectionId)
                .SendAsync("DMSessionRejected", rejecterId);
        }
    }

    /// <summary>
    /// Relay WebRTC SDP offer. Content is NOT logged.
    /// </summary>
    public async Task SendOffer(Guid targetUserId, string sdpOffer)
    {
        var senderId = GetCurrentUserId();

        // PRIVACY: Log action but NEVER log sdpOffer content
        _logger.LogInformation("SDP offer relayed: {SenderId} -> {TargetId}", senderId, targetUserId);

        if (_userConnections.TryGetValue(targetUserId.ToString(), out var targetConnectionId))
        {
            await Clients.Client(targetConnectionId)
                .SendAsync("ReceiveOffer", senderId, sdpOffer);
        }
    }

    /// <summary>
    /// Relay WebRTC SDP answer. Content is NOT logged.
    /// </summary>
    public async Task SendAnswer(Guid targetUserId, string sdpAnswer)
    {
        var senderId = GetCurrentUserId();

        // PRIVACY: Log action but NEVER log sdpAnswer content
        _logger.LogInformation("SDP answer relayed: {SenderId} -> {TargetId}", senderId, targetUserId);

        if (_userConnections.TryGetValue(targetUserId.ToString(), out var targetConnectionId))
        {
            await Clients.Client(targetConnectionId)
                .SendAsync("ReceiveAnswer", senderId, sdpAnswer);
        }
    }

    /// <summary>
    /// Relay ICE candidate. Content is NOT logged.
    /// </summary>
    public async Task SendIceCandidate(Guid targetUserId, string iceCandidate)
    {
        var senderId = GetCurrentUserId();

        // PRIVACY: Log action but NEVER log iceCandidate content
        _logger.LogDebug("ICE candidate relayed: {SenderId} -> {TargetId}", senderId, targetUserId);

        if (_userConnections.TryGetValue(targetUserId.ToString(), out var targetConnectionId))
        {
            await Clients.Client(targetConnectionId)
                .SendAsync("ReceiveIceCandidate", senderId, iceCandidate);
        }
    }

    /// <summary>
    /// End a DM session and notify the peer.
    /// </summary>
    public async Task EndDMSession(Guid peerId)
    {
        var userId = GetCurrentUserId();
        _logger.LogInformation("DM session ended: {UserId} ends session with {PeerId}", userId, peerId);

        if (_userConnections.TryGetValue(peerId.ToString(), out var peerConnectionId))
        {
            await Clients.Client(peerConnectionId)
                .SendAsync("DMSessionEnded", userId);
        }
    }

    /// <summary>
    /// Check if a user is online and available for DM.
    /// </summary>
    public Task<bool> IsUserOnline(Guid userId)
    {
        return Task.FromResult(_userConnections.ContainsKey(userId.ToString()));
    }

    private string GetCurrentUserId()
    {
        var userIdClaim = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                          ?? Context.User?.FindFirst("sub")?.Value;
        return userIdClaim!;
    }
}
