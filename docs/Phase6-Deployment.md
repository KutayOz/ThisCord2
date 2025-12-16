# Phase 6 – Non-Functional Requirements & Deployment Considerations

## Summary

This phase covers scalability, performance, privacy guarantees, observability, and deployment architecture. It also identifies critical risks and mitigation strategies.

---

## Non-Functional Requirements

### 1. Scalability

#### Community Side (Client-Server)

| Component | Scaling Strategy | Target |
|-----------|-----------------|--------|
| **API Servers** | Horizontal scaling behind load balancer | 10,000+ concurrent users per instance |
| **SignalR** | Redis backplane for scale-out | 100,000+ concurrent connections (clustered) |
| **Database** | Read replicas, connection pooling | 10,000+ QPS for reads |
| **Caching** | Redis cluster | Sub-millisecond response for hot data |

**SignalR Scale-Out with Redis:**

```csharp
// Program.cs
builder.Services.AddSignalR()
    .AddStackExchangeRedis(connectionString, options =>
    {
        options.Configuration.ChannelPrefix = "ThisCord";
    });
```

**Database Optimizations:**
- Connection pooling via Npgsql
- Read replicas for message queries
- Partitioning for messages table (by channel_id or time)
- Materialized views for aggregate queries

#### DM Side (P2P)

| Component | Scaling Strategy | Target |
|-----------|-----------------|--------|
| **Signaling** | Stateless, horizontal scaling | 50,000+ concurrent signaling sessions |
| **TURN Server** | Geographic distribution | Multiple regions for low latency |
| **P2P Connections** | Client-side only (no server load) | Unlimited (within client resources) |

**Key Insight:** P2P DMs offload message traffic from servers entirely. Each additional user adds zero server messaging load.

---

### 2. Low Latency Real-Time Messaging

#### Community Channels

| Operation | Target Latency | Strategy |
|-----------|---------------|----------|
| Message delivery (SignalR) | < 100ms | WebSocket persistent connections |
| Typing indicator | < 50ms | Direct SignalR broadcast |
| Presence update | < 200ms | Redis pub/sub |
| Message history load | < 300ms | Indexed queries + caching |

**Optimization Techniques:**
- Keep SignalR connections alive with heartbeats
- Use binary MessagePack protocol instead of JSON
- Preload first page of messages on channel switch
- Optimistic UI updates before server confirmation

```csharp
// Use MessagePack for SignalR
builder.Services.AddSignalR()
    .AddMessagePackProtocol();
```

#### DM Sessions

| Operation | Target Latency | Strategy |
|-----------|---------------|----------|
| Session establishment | < 3s (with TURN) | ICE candidate trickle |
| Message delivery (P2P) | < 50ms | Direct DataChannel |
| File transfer | Bandwidth-limited | Chunked streaming |

---

### 3. Privacy Guarantees for DM

#### Hard Requirements

| Requirement | Implementation | Verification |
|-------------|---------------|--------------|
| No server-side DM storage | DataChannel only, no API endpoints | Code review, no DB schema for DMs |
| No DM logging | Logging filter excludes signaling content | Log audit |
| RAM-only messages | No localStorage/IndexedDB for DMs | Client code review |
| Session key destruction | Nullify keys on session end | Memory profiling |
| Forward secrecy | Ephemeral ECDH per session | Crypto implementation review |

#### Privacy Audit Checklist

```markdown
- [ ] SignalingHub never logs SDP offer/answer content
- [ ] SignalingHub never logs ICE candidate details
- [ ] No database table exists for DM messages
- [ ] Client localStorage/sessionStorage excludes DM data
- [ ] Service workers don't cache DM-related requests
- [ ] Browser DevTools Network tab shows no DM message content to server
- [ ] Memory dump after session end contains no message plaintext
```

---

### 4. Observability (Without Logging Sensitive Data)

#### What to Log (Community)

```csharp
// Safe logging patterns
_logger.LogInformation("User {UserId} joined server {ServerId}", userId, serverId);
_logger.LogInformation("Message sent in channel {ChannelId}", channelId);
_logger.LogWarning("Rate limit exceeded for user {UserId}", userId);
```

#### What NEVER to Log (DM)

```csharp
// FORBIDDEN - Never log content
// _logger.LogInformation("SDP Offer: {Offer}", sdpOffer); ❌
// _logger.LogInformation("ICE Candidate: {Candidate}", candidate); ❌

// Safe alternative
_logger.LogInformation("Signaling: SDP offer relayed from {From} to {To}", fromId, toId);
```

#### Metrics to Collect

| Metric | Type | Purpose |
|--------|------|---------|
| `signalr_connections_active` | Gauge | Current connection count |
| `messages_sent_total` | Counter | Community message throughput |
| `dm_sessions_established_total` | Counter | DM adoption rate (no content) |
| `webrtc_connection_success_rate` | Gauge | P2P connectivity health |
| `api_request_duration_seconds` | Histogram | API latency |
| `signaling_relay_latency_seconds` | Histogram | Signaling performance |

#### Monitoring Stack

```yaml
# Recommended stack
- Prometheus: Metrics collection
- Grafana: Dashboards and alerting
- Seq/ELK: Structured logging (community only)
- Sentry: Error tracking (with PII scrubbing)
```

---

## Deployment Architecture

### High-Level Deployment Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCTION ENVIRONMENT                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         CDN (CloudFlare/Fastly)                      │   │
│   │                    Static Assets + React SPA                        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      Load Balancer (nginx/HAProxy)                   │   │
│   │                    SSL Termination + Sticky Sessions                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│              │                    │                     │                    │
│              ▼                    ▼                     ▼                    │
│   ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐           │
│   │  API Instance 1  │ │  API Instance 2  │ │  API Instance N  │           │
│   │  .NET 8 + SignalR│ │  .NET 8 + SignalR│ │  .NET 8 + SignalR│           │
│   │  (Container)     │ │  (Container)     │ │  (Container)     │           │
│   └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘           │
│            │                    │                     │                     │
│            └────────────────────┼─────────────────────┘                     │
│                                 ▼                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         Redis Cluster                                │   │
│   │         (SignalR Backplane + Cache + Session + Pub/Sub)             │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│                                 ▼                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      PostgreSQL Cluster                              │   │
│   │              Primary (Write) + Replicas (Read)                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    Object Storage (S3/MinIO)                         │   │
│   │                 Community Attachments + Avatars                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            WEBRTC INFRASTRUCTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│   │   STUN Server    │  │   TURN Server    │  │   TURN Server    │          │
│   │   (US-East)      │  │   (US-West)      │  │   (EU-West)      │          │
│   │   coturn         │  │   coturn         │  │   coturn         │          │
│   └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                              │
│   Note: TURN relays encrypted traffic only when P2P fails (symmetric NAT)   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Container Deployment

#### Dockerfile (Backend)

```dockerfile
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/ThisCord.API/ThisCord.API.csproj", "ThisCord.API/"]
COPY ["src/ThisCord.Application/ThisCord.Application.csproj", "ThisCord.Application/"]
COPY ["src/ThisCord.Domain/ThisCord.Domain.csproj", "ThisCord.Domain/"]
COPY ["src/ThisCord.Infrastructure/ThisCord.Infrastructure.csproj", "ThisCord.Infrastructure/"]
RUN dotnet restore "ThisCord.API/ThisCord.API.csproj"
COPY src/ .
RUN dotnet publish "ThisCord.API/ThisCord.API.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 80 443
ENTRYPOINT ["dotnet", "ThisCord.API.dll"]
```

#### Docker Compose (Development)

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: src/ThisCord.API/Dockerfile
    ports:
      - "5000:80"
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - ConnectionStrings__Database=Host=db;Database=thiscord;Username=postgres;Password=devpassword
      - ConnectionStrings__Redis=redis:6379
    depends_on:
      - db
      - redis

  client:
    build:
      context: ./thiscord-client
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - api

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: thiscord
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: devpassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  coturn:
    image: coturn/coturn:latest
    ports:
      - "3478:3478/udp"
      - "3478:3478/tcp"
    command: >
      -n
      --realm=thiscord.local
      --fingerprint
      --lt-cred-mech
      --user=thiscord:turnpassword
      --no-cli

volumes:
  postgres_data:
```

---

### TURN/STUN Server Setup

**Option 1: Self-Hosted (coturn)**

```bash
# /etc/coturn/turnserver.conf
listening-port=3478
tls-listening-port=5349
realm=thiscord.app
server-name=turn.thiscord.app

# Authentication
lt-cred-mech
user=thiscord:your-secure-password

# Security
fingerprint
no-multicast-peers
no-cli

# Logging (no sensitive data)
log-file=/var/log/coturn/turnserver.log
simple-log
```

**Option 2: Managed Service**
- Twilio TURN
- Xirsys
- Daily.co

---

### React Client Deployment

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```nginx
# nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy (optional, if not using separate domain)
    location /api {
        proxy_pass http://api:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /hubs {
        proxy_pass http://api:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Critical Risks and Mitigations

### Risk 1: WebRTC Connectivity Failures

**Risk:** Symmetric NAT or corporate firewalls block P2P connections.

**Impact:** Users cannot establish DM sessions.

**Mitigation:**
- Deploy TURN servers in multiple regions
- Provide clear error messages explaining connectivity issues
- Consider "Relay Mode" fallback (encrypts through server, no storage) as last resort

```typescript
// Connection fallback logic
const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // TURN as fallback
    { 
      urls: ["turn:us-east.turn.thiscord.app:3478", 
             "turns:us-east.turn.thiscord.app:5349"],
      username: "thiscord",
      credential: getTurnCredential()
    }
  ],
  iceTransportPolicy: "all" // Use "relay" to force TURN if needed
};
```

### Risk 2: Message Loss on Disconnect

**Risk:** DM messages lost if peer disconnects unexpectedly.

**Impact:** Users lose conversation history.

**Mitigation:**
- Document this as a feature, not a bug (privacy by design)
- Implement "export chat" feature that creates local encrypted backup
- Show clear warnings about ephemeral nature

### Risk 3: SignalR Connection Limits

**Risk:** Too many concurrent SignalR connections overwhelm the server.

**Impact:** Degraded real-time performance.

**Mitigation:**
- Horizontal scaling with Redis backplane
- Connection limits per user (max 5 devices)
- Graceful degradation to polling for excess connections

### Risk 4: Database Growth from Messages

**Risk:** Community message table grows unbounded.

**Impact:** Query performance degrades over time.

**Mitigation:**
- Time-based partitioning for messages table
- Archival policy (move old messages to cold storage)
- Implement message retention policies per server

### Risk 5: Key Compromise via Client Vulnerability

**Risk:** XSS or malicious extension extracts session keys.

**Impact:** Current session compromised (not past/future).

**Mitigation:**
- Strict Content Security Policy
- Key isolation (Web Workers for crypto operations)
- Regular security audits

---

## Environment Configuration

```bash
# Production environment variables
# API Server
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__Database=Host=db-primary.thiscord.internal;Database=thiscord;...
ConnectionStrings__Redis=redis-cluster.thiscord.internal:6379
Jwt__Key=your-256-bit-secret-key
Jwt__Issuer=thiscord.app
Jwt__Audience=thiscord.app

# Client (build-time)
VITE_API_URL=https://api.thiscord.app
VITE_SIGNALR_URL=https://api.thiscord.app/hubs
VITE_TURN_URL=turn:turn.thiscord.app:3478
```

---

## Summary

This architecture delivers:

1. **Scalable community features** via horizontally-scaled .NET 8 + SignalR + PostgreSQL
2. **Privacy-first DMs** via WebRTC P2P with application-layer E2E encryption
3. **Zero DM persistence** on servers, RAM-only client storage
4. **Observability without privacy leaks** via carefully filtered logging
5. **Multi-region deployment** capability with TURN server distribution

The hybrid model achieves the best of both worlds: feature-rich community management with maximum privacy for direct communication.
