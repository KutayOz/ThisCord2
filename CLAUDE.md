# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ThisCord is a hybrid communication platform combining Discord-like community features with privacy-focused, session-based, end-to-end encrypted direct messaging using WebRTC P2P connections.

## Common Commands

### Backend (.NET 8)

```bash
# Build the entire solution
dotnet build

# Run the API (from repo root)
dotnet run --project src/ThisCord.API

# Run tests
dotnet test

# Add EF Core migration
cd src/ThisCord.API
dotnet ef migrations add <MigrationName> --project ../ThisCord.Infrastructure

# Apply migrations
dotnet ef database update
```

### Frontend (React + Vite)

```bash
cd thiscord-client

npm install       # Install dependencies
npm run dev       # Start dev server (http://localhost:5173)
npm run build     # Production build (runs tsc first)
npm run lint      # ESLint check
npm run preview   # Preview production build
```

### Docker

```bash
# Run full stack (API + PostgreSQL + Client)
docker compose up --build

# Services: db (postgres:5433), api (5284), client (5173)
```

## Architecture

### Backend - Clean Architecture (.NET 8)

```
src/
├── ThisCord.Domain/        # Core entities, enums (no dependencies)
│   ├── Entities/           # User, Server, Channel, Message, Role, etc.
│   └── Enums/              # ChannelType, MembershipStatus, etc.
├── ThisCord.Application/   # DTOs, interfaces, business logic contracts
│   ├── DTOs/               # Request/response models
│   ├── Interfaces/         # Service interfaces (IUserService, etc.)
│   └── Services/           # Abstract service implementations
├── ThisCord.Infrastructure/# EF Core, concrete services, persistence
│   ├── Persistence/        # DbContext, configurations
│   ├── Services/           # Concrete service implementations
│   └── Migrations/         # EF Core migrations
└── ThisCord.API/           # Controllers, SignalR hubs, middleware
    ├── Controllers/        # REST endpoints (Auth, Servers, Channels, Messages, Friends)
    └── Hubs/               # CommunityHub, SignalingHub, VoiceHub
```

### Frontend - React + TypeScript

```
thiscord-client/src/
├── api/           # Axios API clients (auth, servers, channels, friends, uploads)
├── components/    # UI components organized by feature (chat, dm, layout, modals, voice)
├── pages/         # Route pages
├── services/      # Real-time services (dmService, voiceService, hubs)
├── stores/        # Zustand state stores (appStore, authStore, dmStore, voiceStore)
└── types/         # TypeScript type definitions
```

### Key Architectural Concepts

**Dual Communication Modes:**
1. **Community Mode** - REST API + SignalR for servers/channels, messages stored in PostgreSQL
2. **DM Mode** - WebRTC DataChannels for P2P encrypted messaging, messages stay in client RAM only

**SignalR Hubs:**
- `/hubs/community` - Real-time community features (messages, presence, typing)
- `/hubs/signaling` - WebRTC signaling (SDP/ICE relay for P2P connection setup)
- `/hubs/voice` - Voice channel coordination

**Privacy Design:**
- DM messages never touch the server, only signaling metadata passes through
- Session-based ECDH encryption for DMs with forward secrecy
- No message history for DMs - wiped when session ends

## Tech Stack

- **Backend:** .NET 8, ASP.NET Core, SignalR, EF Core, PostgreSQL, JWT auth
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, Zustand, @microsoft/signalr
- **Real-time:** SignalR (community), WebRTC DataChannels (P2P DMs)
