# Phase 1 – High-Level Architecture & Modules

## Summary

ThisCord is a hybrid communication platform with two distinct communication modes:
1. **Community Mode** – Classic Client–Server architecture for servers, channels, and group messaging
2. **DM Mode** – Serverless P2P architecture using WebRTC for privacy-focused direct messaging

The backend serves dual purposes: a full-featured API for community features and a minimal signaling relay for P2P session establishment.

---

## Top-Level Components

### 1. Backend Services (.NET 8)

```
┌─────────────────────────────────────────────────────────────────┐
│                        ThisCord.API                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  REST API    │  │  SignalR     │  │  WebRTC Signaling    │   │
│  │  Controllers │  │  Hubs        │  │  Hub                 │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│         │                 │                     │                │
│  ┌──────┴─────────────────┴─────────────────────┴──────────┐    │
│  │                   Application Services                   │    │
│  │  (CommunityService, ChannelService, MessageService,     │    │
│  │   UserService, SignalingService)                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                                                        │
│  ┌──────┴──────────────────────────────────────────────────┐    │
│  │                   Domain Layer                           │    │
│  │  (Entities, Value Objects, Domain Events)               │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                                                        │
│  ┌──────┴──────────────────────────────────────────────────┐    │
│  │                   Infrastructure                         │    │
│  │  (EF Core, Redis Cache, JWT Auth)                       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**

| Component | Responsibility |
|-----------|----------------|
| **REST API Controllers** | CRUD for users, servers, channels, messages, roles |
| **CommunityHub (SignalR)** | Real-time messaging, presence, typing indicators for community channels |
| **SignalingHub (SignalR)** | WebRTC signaling only – SDP exchange, ICE candidates relay |
| **Application Services** | Business logic orchestration |
| **Domain Layer** | Core entities and business rules |
| **Infrastructure** | Data persistence (PostgreSQL), caching (Redis), authentication |

---

### 2. Frontend Application (React)

```
┌─────────────────────────────────────────────────────────────────┐
│                      ThisCord React App                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    App Shell                             │    │
│  │  (Routing, Auth Context, Theme, Global State)           │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                                                        │
│  ┌──────┴──────────────────────────────────────────────────┐    │
│  │                    Feature Modules                       │    │
│  ├──────────────┬──────────────┬───────────────────────────┤    │
│  │  Community   │  Direct      │  Settings &               │    │
│  │  Module      │  Messages    │  Profile                  │    │
│  │              │  Module      │  Module                   │    │
│  └──────────────┴──────────────┴───────────────────────────┘    │
│         │                 │                                      │
│  ┌──────┴─────────────────┴────────────────────────────────┐    │
│  │                    Shared Services                       │    │
│  │  (API Client, SignalR Client, WebRTC Manager,           │    │
│  │   Auth Service, Crypto Utils)                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                                                        │
│  ┌──────┴──────────────────────────────────────────────────┐    │
│  │                    UI Components                         │    │
│  │  (MessageList, MessageInput, ChannelList, UserList,     │    │
│  │   ServerSidebar, DMList, Modal, etc.)                   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**Key Modules:**

| Module | Responsibility |
|--------|----------------|
| **Community Module** | Server browser, channel views, community messaging |
| **DM Module** | P2P session management, ephemeral chat UI, WebRTC state |
| **Settings Module** | User profile, preferences, privacy settings |
| **Shared Services** | API client (axios/fetch), SignalR connection manager, WebRTC peer manager |

---

### 3. Database & Caching

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Primary Database** | PostgreSQL | Persistent storage for users, servers, channels, community messages |
| **Cache** | Redis | Session tokens, presence status, rate limiting, pub/sub for SignalR scale-out |
| **In-Memory Only** | Client RAM | DM messages, session keys, file buffers (never persisted) |

---

## Communication Flows

### Flow A: Community Server Messaging

```
User A (Browser)                    Backend                         Database
     │                                 │                                │
     │──── POST /api/messages ────────▶│                                │
     │     {channelId, content}        │                                │
     │                                 │──── INSERT message ───────────▶│
     │                                 │◀─── OK ────────────────────────│
     │◀─── 201 Created ────────────────│                                │
     │                                 │                                │
     │                           SignalR Hub                            │
     │                                 │                                │
     │◀── ReceiveMessage (broadcast) ──│                                │
     │                                 │                                │
User B (Browser)                       │                                │
     │◀── ReceiveMessage (broadcast) ──│                                │
```

**Steps:**
1. User A sends message via REST API
2. Backend validates, stores in PostgreSQL
3. Backend broadcasts via SignalR `CommunityHub` to all channel subscribers
4. All connected clients receive real-time update

---

### Flow B: Direct Message (P2P WebRTC)

```
User A                          Signaling Server                     User B
  │                                   │                                 │
  │── RequestDMSession(userBId) ─────▶│                                 │
  │                                   │── DMSessionRequest ────────────▶│
  │                                   │◀─ AcceptDMSession ──────────────│
  │◀─ SessionAccepted ────────────────│                                 │
  │                                   │                                 │
  │── SDP Offer ─────────────────────▶│                                 │
  │                                   │── SDP Offer ───────────────────▶│
  │                                   │◀─ SDP Answer ───────────────────│
  │◀─ SDP Answer ─────────────────────│                                 │
  │                                   │                                 │
  │── ICE Candidate ─────────────────▶│                                 │
  │                                   │── ICE Candidate ───────────────▶│
  │◀─ ICE Candidate ──────────────────│◀─ ICE Candidate ────────────────│
  │                                   │                                 │
  ╔═══════════════════════════════════════════════════════════════════╗
  ║              WebRTC DataChannel Established (P2P)                  ║
  ╚═══════════════════════════════════════════════════════════════════╝
  │                                                                     │
  │◀════════════ Encrypted Messages (Direct P2P) ═════════════════════▶│
  │                        NO SERVER INVOLVEMENT                        │
  │                                                                     │
  │── EndSession ──────────────────────────────────────────────────────▶│
  │                                                                     │
  │   [Both clients wipe RAM buffers]                                   │
```

**Steps:**
1. User A requests DM session via SignalR `SignalingHub`
2. Backend relays request to User B (if online)
3. User B accepts → Backend notifies User A
4. WebRTC negotiation: SDP offer/answer + ICE candidates exchanged via signaling
5. DataChannel established → Direct P2P communication
6. All messages flow directly between peers, encrypted with session key
7. Session ends → Both clients wipe all message data from RAM

---

## Data Boundary: Persistent vs Ephemeral

| Data Type | Storage Location | Lifetime | Server Access |
|-----------|------------------|----------|---------------|
| User accounts, profiles | PostgreSQL | Permanent | Full |
| Community servers, channels | PostgreSQL | Permanent | Full |
| Community messages | PostgreSQL | Permanent (soft-delete) | Full |
| Attachments (community) | Object Storage (S3/local) | Permanent | Full |
| User presence status | Redis | Session duration | Full |
| **DM session metadata** | Redis (optional) | Session only | Minimal (who is talking, not content) |
| **DM messages** | Client RAM only | Session only | **None** |
| **DM files/attachments** | Client RAM only | Session only | **None** |
| **Session encryption keys** | Client RAM only | Session only | **None** |

---

## Key Architectural Decisions

### Decision 1: Separate SignalR Hubs
- `CommunityHub` – Handles community real-time features
- `SignalingHub` – Handles only WebRTC signaling

**Rationale:** Clear separation of concerns. SignalingHub is minimal and stateless; CommunityHub is feature-rich.

### Decision 2: No DM Fallback to Server
When WebRTC fails (e.g., symmetric NAT), users cannot message. 

**Trade-off:** Privacy > availability for DMs. We will provide clear UI feedback and TURN server support to maximize connectivity.

### Decision 3: Session-Based Encryption
Each DM session generates a fresh ECDH key pair. Session key is derived, used for AES-GCM encryption over DataChannel.

**Rationale:** Even if WebRTC's DTLS is compromised, application-layer encryption provides defense in depth.

### Decision 4: No Message History for DMs
DM messages are never stored. When session ends, messages are gone forever.

**Trade-off:** Privacy > convenience. Users who want persistence can use community channels.

---

## Component Interaction Summary

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                    │
│  ┌────────────────────────┐          ┌────────────────────────┐        │
│  │      User A Client     │◀════════▶│      User B Client     │        │
│  │                        │  WebRTC  │                        │        │
│  │  [DM Messages in RAM]  │  P2P     │  [DM Messages in RAM]  │        │
│  └───────────┬────────────┘          └────────────┬───────────┘        │
│              │                                    │                     │
│              │ REST + SignalR                     │ REST + SignalR      │
│              │                                    │                     │
└──────────────┼────────────────────────────────────┼─────────────────────┘
               │                                    │
               ▼                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │
│  │    REST API     │  │  CommunityHub   │  │    SignalingHub         │   │
│  │                 │  │  (SignalR)      │  │    (SignalR)            │   │
│  │  - Users        │  │                 │  │                         │   │
│  │  - Servers      │  │  - Messages     │  │  - SDP relay            │   │
│  │  - Channels     │  │  - Presence     │  │  - ICE relay            │   │
│  │  - Messages     │  │  - Typing       │  │  - Session requests     │   │
│  └────────┬────────┘  └────────┬────────┘  └────────────────────────┘   │
│           │                    │                                         │
│           ▼                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      PostgreSQL + Redis                          │    │
│  │  [Users, Servers, Channels, Community Messages, Presence]       │    │
│  │  [NO DM CONTENT EVER STORED]                                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Next Phase

Phase 2 will detail the data model for the Community side, including all entities, relationships, and indexing strategies for efficient querying.
