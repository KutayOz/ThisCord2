# Phase 3 – Backend API and SignalR Design (.NET 8)

## Summary

This phase defines the .NET 8 backend structure using Clean Architecture principles. The API exposes REST endpoints for CRUD operations and SignalR hubs for real-time features.

---

## Project Structure

```
ThisCord/
├── src/
│   ├── ThisCord.API/                    # ASP.NET Core Web API (entry point)
│   │   ├── Controllers/                 # REST API controllers
│   │   ├── Hubs/                        # SignalR hubs
│   │   ├── Middleware/                  # Custom middleware
│   │   ├── Filters/                     # Action filters
│   │   └── Program.cs                   # Application entry
│   │
│   ├── ThisCord.Application/            # Application layer (CQRS, services)
│   │   ├── Commands/                    # Command handlers
│   │   ├── Queries/                     # Query handlers
│   │   ├── Services/                    # Application services
│   │   ├── DTOs/                        # Data transfer objects
│   │   ├── Interfaces/                  # Service interfaces
│   │   └── Validators/                  # FluentValidation validators
│   │
│   ├── ThisCord.Domain/                 # Domain layer (entities, value objects)
│   │   ├── Entities/                    # Domain entities
│   │   ├── ValueObjects/                # Value objects
│   │   ├── Enums/                       # Domain enums
│   │   ├── Events/                      # Domain events
│   │   └── Exceptions/                  # Domain exceptions
│   │
│   └── ThisCord.Infrastructure/         # Infrastructure layer
│       ├── Persistence/                 # EF Core DbContext, configs
│       ├── Repositories/                # Repository implementations
│       ├── Services/                    # External service implementations
│       ├── Identity/                    # JWT, auth services
│       └── Caching/                     # Redis caching
│
├── tests/
│   ├── ThisCord.UnitTests/
│   ├── ThisCord.IntegrationTests/
│   └── ThisCord.E2ETests/
│
└── docker-compose.yml
```

---

## REST API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create new account | No |
| POST | `/api/auth/login` | Login, returns JWT | No |
| POST | `/api/auth/refresh` | Refresh JWT token | Yes (refresh token) |
| POST | `/api/auth/logout` | Invalidate refresh token | Yes |
| GET | `/api/auth/me` | Get current user info | Yes |

**Request/Response Examples:**

```csharp
// POST /api/auth/register
public record RegisterRequest(string Username, string Email, string Password);
public record AuthResponse(string AccessToken, string RefreshToken, UserDto User);

// POST /api/auth/login
public record LoginRequest(string Email, string Password);
```

---

### User Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users/{id}` | Get user profile | Yes |
| PUT | `/api/users/{id}` | Update own profile | Yes (owner) |
| GET | `/api/users/{id}/servers` | Get user's servers | Yes (owner) |
| PUT | `/api/users/{id}/status` | Update online status | Yes (owner) |

---

### Server (Community) Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/servers` | Create new server | Yes |
| GET | `/api/servers/{id}` | Get server details | Yes (member) |
| PUT | `/api/servers/{id}` | Update server | Yes (owner/admin) |
| DELETE | `/api/servers/{id}` | Delete server (soft) | Yes (owner) |
| GET | `/api/servers/{id}/channels` | List channels | Yes (member) |
| GET | `/api/servers/{id}/members` | List members | Yes (member) |
| POST | `/api/servers/join/{inviteCode}` | Join via invite | Yes |
| DELETE | `/api/servers/{id}/leave` | Leave server | Yes (member) |

**Controller Signature:**

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ServersController : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ServerDto>> Create(CreateServerRequest request);
    
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ServerDto>> GetById(Guid id);
    
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ServerDto>> Update(Guid id, UpdateServerRequest request);
    
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id);
    
    [HttpPost("join/{inviteCode}")]
    public async Task<ActionResult<ServerDto>> Join(string inviteCode);
    
    [HttpDelete("{id:guid}/leave")]
    public async Task<IActionResult> Leave(Guid id);
}
```

---

### Channel Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/servers/{serverId}/channels` | Create channel | Yes (admin) |
| GET | `/api/channels/{id}` | Get channel details | Yes (member) |
| PUT | `/api/channels/{id}` | Update channel | Yes (admin) |
| DELETE | `/api/channels/{id}` | Delete channel | Yes (admin) |

---

### Message Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/channels/{channelId}/messages` | Get messages (paginated) | Yes (member) |
| POST | `/api/channels/{channelId}/messages` | Send message | Yes (member) |
| PUT | `/api/messages/{id}` | Edit message | Yes (author) |
| DELETE | `/api/messages/{id}` | Delete message | Yes (author/mod) |

**Pagination Query Parameters:**
```
GET /api/channels/{id}/messages?before={messageId}&limit=50
GET /api/channels/{id}/messages?after={messageId}&limit=50
```

**Message Request/Response:**

```csharp
public record SendMessageRequest(string Content, Guid? ReplyToId);

public record MessageDto(
    Guid Id,
    Guid ChannelId,
    UserDto Author,
    string Content,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    Guid? ReplyToId,
    List<AttachmentDto> Attachments
);
```

---

### Role Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/servers/{serverId}/roles` | Create role | Yes (admin) |
| GET | `/api/servers/{serverId}/roles` | List roles | Yes (member) |
| PUT | `/api/roles/{id}` | Update role | Yes (admin) |
| DELETE | `/api/roles/{id}` | Delete role | Yes (admin) |
| POST | `/api/members/{memberId}/roles/{roleId}` | Assign role | Yes (admin) |
| DELETE | `/api/members/{memberId}/roles/{roleId}` | Remove role | Yes (admin) |

---

## SignalR Hubs

### CommunityHub

Handles real-time community features.

**Hub Path:** `/hubs/community`

```csharp
[Authorize]
public class CommunityHub : Hub
{
    // ===== Connection Management =====
    
    public override async Task OnConnectedAsync()
    {
        // Add user to their server groups
        // Broadcast presence update
    }
    
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Remove from groups
        // Broadcast offline status
    }
    
    // ===== Channel Subscription =====
    
    public async Task JoinChannel(Guid channelId)
    {
        // Validate membership
        await Groups.AddToGroupAsync(Context.ConnectionId, $"channel:{channelId}");
    }
    
    public async Task LeaveChannel(Guid channelId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"channel:{channelId}");
    }
    
    // ===== Messaging (Server-to-Client broadcasts) =====
    
    // Called internally when REST API creates a message
    // Client method: ReceiveMessage(MessageDto message)
    
    // ===== Typing Indicators =====
    
    public async Task StartTyping(Guid channelId)
    {
        await Clients.Group($"channel:{channelId}")
            .SendAsync("UserTyping", Context.UserIdentifier, channelId);
    }
    
    public async Task StopTyping(Guid channelId)
    {
        await Clients.Group($"channel:{channelId}")
            .SendAsync("UserStoppedTyping", Context.UserIdentifier, channelId);
    }
    
    // ===== Presence =====
    
    public async Task UpdatePresence(PresenceStatus status)
    {
        // Update in Redis
        // Broadcast to relevant server groups
    }
}
```

**Client-Side Events (Server → Client):**

| Event | Payload | Description |
|-------|---------|-------------|
| `ReceiveMessage` | `MessageDto` | New message in subscribed channel |
| `MessageUpdated` | `MessageDto` | Message edited |
| `MessageDeleted` | `{messageId, channelId}` | Message deleted |
| `UserTyping` | `{userId, channelId}` | User started typing |
| `UserStoppedTyping` | `{userId, channelId}` | User stopped typing |
| `PresenceUpdated` | `{userId, status}` | User presence changed |
| `MemberJoined` | `{serverId, member}` | New member joined server |
| `MemberLeft` | `{serverId, userId}` | Member left server |

---

### SignalingHub

Handles WebRTC signaling for P2P DMs. **Minimal and stateless.**

**Hub Path:** `/hubs/signaling`

```csharp
[Authorize]
public class SignalingHub : Hub
{
    private readonly IConnectionMapping _connections; // userId -> connectionId mapping
    
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        _connections.Add(userId, Context.ConnectionId);
        await base.OnConnectedAsync();
    }
    
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier;
        _connections.Remove(userId);
        
        // Notify any active DM peers that user disconnected
        await NotifyPeersOfDisconnection(userId);
        
        await base.OnDisconnectedAsync(exception);
    }
    
    // ===== DM Session Initiation =====
    
    public async Task RequestDMSession(Guid targetUserId)
    {
        var targetConnectionId = _connections.GetConnection(targetUserId);
        if (targetConnectionId == null)
        {
            await Clients.Caller.SendAsync("DMSessionError", "User is offline");
            return;
        }
        
        await Clients.Client(targetConnectionId)
            .SendAsync("DMSessionRequest", Context.UserIdentifier);
    }
    
    public async Task AcceptDMSession(Guid requesterId)
    {
        var requesterConnectionId = _connections.GetConnection(requesterId);
        if (requesterConnectionId != null)
        {
            await Clients.Client(requesterConnectionId)
                .SendAsync("DMSessionAccepted", Context.UserIdentifier);
        }
    }
    
    public async Task RejectDMSession(Guid requesterId)
    {
        var requesterConnectionId = _connections.GetConnection(requesterId);
        if (requesterConnectionId != null)
        {
            await Clients.Client(requesterConnectionId)
                .SendAsync("DMSessionRejected", Context.UserIdentifier);
        }
    }
    
    // ===== WebRTC Signaling =====
    
    public async Task SendOffer(Guid targetUserId, string sdpOffer)
    {
        var targetConnectionId = _connections.GetConnection(targetUserId);
        if (targetConnectionId != null)
        {
            await Clients.Client(targetConnectionId)
                .SendAsync("ReceiveOffer", Context.UserIdentifier, sdpOffer);
        }
    }
    
    public async Task SendAnswer(Guid targetUserId, string sdpAnswer)
    {
        var targetConnectionId = _connections.GetConnection(targetUserId);
        if (targetConnectionId != null)
        {
            await Clients.Client(targetConnectionId)
                .SendAsync("ReceiveAnswer", Context.UserIdentifier, sdpAnswer);
        }
    }
    
    public async Task SendIceCandidate(Guid targetUserId, string iceCandidate)
    {
        var targetConnectionId = _connections.GetConnection(targetUserId);
        if (targetConnectionId != null)
        {
            await Clients.Client(targetConnectionId)
                .SendAsync("ReceiveIceCandidate", Context.UserIdentifier, iceCandidate);
        }
    }
    
    // ===== Session Termination =====
    
    public async Task EndDMSession(Guid peerId)
    {
        var peerConnectionId = _connections.GetConnection(peerId);
        if (peerConnectionId != null)
        {
            await Clients.Client(peerConnectionId)
                .SendAsync("DMSessionEnded", Context.UserIdentifier);
        }
    }
}
```

**Client-Side Events (Server → Client):**

| Event | Payload | Description |
|-------|---------|-------------|
| `DMSessionRequest` | `userId` | Incoming DM request |
| `DMSessionAccepted` | `userId` | Peer accepted DM |
| `DMSessionRejected` | `userId` | Peer rejected DM |
| `ReceiveOffer` | `{userId, sdp}` | WebRTC SDP offer |
| `ReceiveAnswer` | `{userId, sdp}` | WebRTC SDP answer |
| `ReceiveIceCandidate` | `{userId, candidate}` | ICE candidate |
| `DMSessionEnded` | `userId` | Peer ended session |
| `DMSessionError` | `message` | Error message |

---

## Authentication & Security

### JWT Authentication Strategy

```csharp
// Program.cs configuration
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = config["Jwt:Issuer"],
            ValidAudience = config["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(config["Jwt:Key"]))
        };
        
        // SignalR JWT from query string
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                
                if (!string.IsNullOrEmpty(accessToken) && 
                    path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });
```

### Token Structure

```json
{
  "sub": "user-guid",
  "name": "username",
  "email": "user@email.com",
  "iat": 1699900000,
  "exp": 1699903600,
  "iss": "ThisCord",
  "aud": "ThisCord.Client"
}
```

### Access Tokens vs Refresh Tokens

| Token Type | Lifetime | Storage | Purpose |
|------------|----------|---------|---------|
| Access Token | 15 minutes | Memory/HttpOnly cookie | API/Hub authentication |
| Refresh Token | 7 days | HttpOnly cookie + DB | Token renewal |

### Authorization

```csharp
// Custom authorization policy for server membership
services.AddAuthorization(options =>
{
    options.AddPolicy("ServerMember", policy =>
        policy.Requirements.Add(new ServerMemberRequirement()));
        
    options.AddPolicy("ServerAdmin", policy =>
        policy.Requirements.Add(new ServerRoleRequirement(PermissionType.ManageServer)));
});

// Usage in controller
[Authorize(Policy = "ServerMember")]
[HttpGet("{id}/channels")]
public async Task<ActionResult<List<ChannelDto>>> GetChannels(Guid id) { }
```

---

## Rate Limiting

```csharp
// Per-user rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("messages", context =>
        RateLimitPartition.GetTokenBucketLimiter(
            context.User?.Identity?.Name ?? "anonymous",
            _ => new TokenBucketRateLimiterOptions
            {
                TokenLimit = 10,
                ReplenishmentPeriod = TimeSpan.FromSeconds(1),
                TokensPerPeriod = 5
            }));
});

// Apply to controller
[EnableRateLimiting("messages")]
[HttpPost]
public async Task<ActionResult<MessageDto>> SendMessage(...) { }
```

---

## Error Handling

```csharp
// Global exception handler middleware
public class ExceptionHandlingMiddleware
{
    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (NotFoundException ex)
        {
            context.Response.StatusCode = 404;
            await context.Response.WriteAsJsonAsync(new { error = ex.Message });
        }
        catch (ForbiddenException ex)
        {
            context.Response.StatusCode = 403;
            await context.Response.WriteAsJsonAsync(new { error = ex.Message });
        }
        catch (ValidationException ex)
        {
            context.Response.StatusCode = 400;
            await context.Response.WriteAsJsonAsync(new { errors = ex.Errors });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            context.Response.StatusCode = 500;
            await context.Response.WriteAsJsonAsync(new { error = "Internal server error" });
        }
    }
}
```

---

## Next Phase

Phase 4 will detail the WebRTC P2P DM system, including session lifecycle, encryption, and privacy guarantees.
