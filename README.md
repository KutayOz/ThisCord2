# ThisCord

A hybrid communication platform combining Discord-like community features with privacy-focused, session-based, end-to-end encrypted direct messaging.

## Architecture

ThisCord uses a **hybrid architecture**:

1. **Community Mode (Client-Server)**
   - Servers, channels, roles, and public/group messaging
   - REST API + SignalR for real-time features
   - Messages stored in PostgreSQL

2. **DM Mode (Peer-to-Peer)**
   - WebRTC DataChannels for direct communication
   - End-to-end encryption with per-session keys
   - **Messages NEVER touch the server** - RAM only

## Tech Stack

### Backend (.NET 8)
- ASP.NET Core Web API
- SignalR for real-time messaging
- Entity Framework Core + PostgreSQL
- JWT authentication
- WebRTC signaling (SDP/ICE relay only)

### Frontend (React)
- React 18 + TypeScript
- Vite build tool
- TailwindCSS for styling
- Zustand for state management
- React Query for server state
- @microsoft/signalr for real-time

## Project Structure

```
ThisCord/
├── docs/                      # Architecture documentation
│   ├── Phase1-HighLevelArchitecture.md
│   ├── Phase2-DataModeling.md
│   ├── Phase3-BackendAPI.md
│   ├── Phase4-WebRTC-DM.md
│   ├── Phase5-FrontendArchitecture.md
│   └── Phase6-Deployment.md
├── src/
│   ├── ThisCord.Domain/       # Domain entities and enums
│   ├── ThisCord.Application/  # DTOs and interfaces
│   ├── ThisCord.Infrastructure/ # EF Core, services
│   └── ThisCord.API/          # Controllers, SignalR hubs
└── thiscord-client/           # React frontend
```

## Getting Started

### Prerequisites
- .NET 8 SDK
- Node.js 18+
- PostgreSQL 15+
- Redis (optional, for SignalR scale-out)

### Backend Setup

1. Update connection string in `src/ThisCord.API/appsettings.json`

2. Run database migrations:
```bash
cd src/ThisCord.API
dotnet ef migrations add InitialCreate --project ../ThisCord.Infrastructure
dotnet ef database update
```

3. Start the API:
```bash
dotnet run --project src/ThisCord.API
```

The API will be available at `http://localhost:5000`

### Frontend Setup

1. Install dependencies:
```bash
cd thiscord-client
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Start the dev server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Servers
- `GET /api/servers` - List user's servers
- `POST /api/servers` - Create server
- `GET /api/servers/{id}` - Get server details
- `POST /api/servers/join/{inviteCode}` - Join server

### Channels
- `GET /api/servers/{id}/channels` - List channels
- `POST /api/channels/servers/{serverId}` - Create channel
- `GET /api/channels/{id}/messages` - Get messages

### SignalR Hubs
- `/hubs/community` - Community real-time features
- `/hubs/signaling` - WebRTC signaling for P2P DMs

## Privacy Guarantees

### Direct Messages
- ✅ Messages transmitted via WebRTC P2P
- ✅ End-to-end encrypted with session keys
- ✅ Never stored on server (RAM only on clients)
- ✅ Wiped when session ends
- ✅ Forward secrecy via ephemeral ECDH keys

### What the server knows
- Who is online
- Who initiates DM sessions (metadata)
- **NOT** message content
- **NOT** session encryption keys

## Development

### Build Backend
```bash
dotnet build
```

### Build Frontend
```bash
cd thiscord-client
npm run build
```

### Run Tests
```bash
dotnet test
```

## License

MIT
