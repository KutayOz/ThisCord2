# Phase 5 – Frontend Architecture (React)

## Summary

This phase defines the React application structure. The UI mirrors the hybrid architecture: persistent community features backed by REST/SignalR and ephemeral DM sessions managed entirely client-side via WebRTC.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | React 18+ | Component-based UI |
| Routing | React Router v6 | SPA navigation |
| State Management | Zustand + React Query | Global state + server state |
| Styling | TailwindCSS | Utility-first styling |
| UI Components | shadcn/ui | Accessible component primitives |
| Icons | Lucide React | Modern icon library |
| HTTP Client | Axios | REST API calls |
| Real-time | @microsoft/signalr | SignalR client |
| WebRTC | Native RTCPeerConnection | P2P connections |
| Forms | React Hook Form + Zod | Form handling + validation |

---

## Application Structure

```
thiscord-client/
├── public/
│   └── index.html
├── src/
│   ├── main.tsx                      # Entry point
│   ├── App.tsx                       # Root component with providers
│   │
│   ├── components/                   # Shared UI components
│   │   ├── ui/                       # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── avatar.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx         # Main app shell
│   │   │   ├── Sidebar.tsx           # Server list sidebar
│   │   │   └── TopBar.tsx            # Top navigation bar
│   │   ├── chat/
│   │   │   ├── MessageList.tsx       # Scrollable message list
│   │   │   ├── MessageItem.tsx       # Single message display
│   │   │   ├── MessageInput.tsx      # Message composer
│   │   │   ├── TypingIndicator.tsx
│   │   │   └── AttachmentPreview.tsx
│   │   ├── server/
│   │   │   ├── ServerIcon.tsx
│   │   │   ├── ChannelList.tsx
│   │   │   ├── ChannelItem.tsx
│   │   │   └── MemberList.tsx
│   │   ├── dm/
│   │   │   ├── DMList.tsx            # List of DM sessions
│   │   │   ├── DMChatView.tsx        # Ephemeral DM chat
│   │   │   ├── DMRequestModal.tsx    # Incoming DM request
│   │   │   └── SessionIndicator.tsx  # P2P connection status
│   │   └── common/
│   │       ├── UserAvatar.tsx
│   │       ├── PresenceIndicator.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── pages/                        # Route-level components
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── home/
│   │   │   └── HomePage.tsx          # Server browser / friends
│   │   ├── server/
│   │   │   ├── ServerPage.tsx        # Server view wrapper
│   │   │   └── ChannelPage.tsx       # Channel chat view
│   │   ├── dm/
│   │   │   └── DMPage.tsx            # Direct messages view
│   │   └── settings/
│   │       └── SettingsPage.tsx
│   │
│   ├── features/                     # Feature-specific logic
│   │   ├── auth/
│   │   │   ├── authApi.ts            # Auth API calls
│   │   │   ├── authStore.ts          # Auth state (Zustand)
│   │   │   └── useAuth.ts            # Auth hook
│   │   ├── servers/
│   │   │   ├── serverApi.ts
│   │   │   ├── serverStore.ts
│   │   │   └── useServers.ts
│   │   ├── channels/
│   │   │   ├── channelApi.ts
│   │   │   └── useChannelMessages.ts # React Query hook
│   │   ├── messages/
│   │   │   ├── messageApi.ts
│   │   │   └── useMessages.ts
│   │   └── dm/
│   │       ├── dmStore.ts            # DM session state
│   │       ├── webrtcManager.ts      # WebRTC connection management
│   │       ├── dmCrypto.ts           # E2E encryption
│   │       └── useDMSession.ts
│   │
│   ├── services/                     # Core services
│   │   ├── api/
│   │   │   ├── apiClient.ts          # Axios instance
│   │   │   └── endpoints.ts          # API endpoint constants
│   │   ├── signalr/
│   │   │   ├── hubConnection.ts      # SignalR connection manager
│   │   │   ├── communityHub.ts       # Community hub handlers
│   │   │   └── signalingHub.ts       # Signaling hub handlers
│   │   └── webrtc/
│   │       ├── peerConnection.ts     # RTCPeerConnection wrapper
│   │       ├── dataChannel.ts        # DataChannel management
│   │       └── iceServers.ts         # STUN/TURN config
│   │
│   ├── hooks/                        # Shared hooks
│   │   ├── useSignalR.ts
│   │   ├── useWebRTC.ts
│   │   ├── useInfiniteScroll.ts
│   │   └── usePresence.ts
│   │
│   ├── utils/                        # Utilities
│   │   ├── crypto.ts                 # Web Crypto helpers
│   │   ├── formatters.ts             # Date, text formatting
│   │   └── validators.ts             # Zod schemas
│   │
│   ├── types/                        # TypeScript types
│   │   ├── api.ts                    # API response types
│   │   ├── entities.ts               # Domain entities
│   │   ├── signalr.ts                # SignalR message types
│   │   └── webrtc.ts                 # WebRTC types
│   │
│   └── styles/
│       └── globals.css               # Tailwind base + custom styles
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

---

## Main UI Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ┌────┐ ┌─────────────────────────────────────────────────────────────┐   │
│ │    │ │  TopBar: Server Name / Channel Name / DM Partner            │   │
│ │ S  │ └─────────────────────────────────────────────────────────────┘   │
│ │ E  │ ┌─────────────┐ ┌─────────────────────────────┐ ┌────────────┐   │
│ │ R  │ │             │ │                             │ │            │   │
│ │ V  │ │  Channel    │ │      Message List           │ │  Member    │   │
│ │ E  │ │  List       │ │                             │ │  List      │   │
│ │ R  │ │             │ │  - Message 1                │ │            │   │
│ │    │ │  # general  │ │  - Message 2                │ │  @user1    │   │
│ │ L  │ │  # random   │ │  - Message 3                │ │  @user2    │   │
│ │ I  │ │  # help     │ │  - ...                      │ │  @user3    │   │
│ │ S  │ │             │ │                             │ │            │   │
│ │ T  │ │  ────────── │ │                             │ │            │   │
│ │    │ │  DMs        │ │                             │ │            │   │
│ │    │ │  👤 Alice   │ │                             │ │            │   │
│ │    │ │  👤 Bob     │ ├─────────────────────────────┤ │            │   │
│ │    │ │             │ │  [Message Input]         📎 │ │            │   │
│ └────┘ └─────────────┘ └─────────────────────────────┘ └────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Layout Components

```tsx
// src/components/layout/AppLayout.tsx
export function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Server Sidebar - Vertical icon list */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Channel/DM List */}
        <aside className="w-60 bg-gray-800 flex flex-col">
          <ServerHeader />
          <ChannelList />
          <DMSection />
          <UserPanel />
        </aside>
        
        {/* Chat Area */}
        <main className="flex-1 flex flex-col">
          <TopBar />
          <div className="flex flex-1 overflow-hidden">
            <ChatArea />
            <MemberList /> {/* Only for community channels */}
          </div>
        </main>
      </div>
    </div>
  );
}
```

---

## State Management Strategy

### Global State (Zustand)

Used for:
- Authentication state
- Current user profile
- Active server/channel selection
- DM sessions (ephemeral, RAM-only)
- UI state (modals, sidebars)

```tsx
// src/features/auth/authStore.ts
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      
      login: async (credentials) => {
        const response = await authApi.login(credentials);
        set({
          user: response.user,
          accessToken: response.accessToken,
          isAuthenticated: true
        });
      },
      
      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
        // Also disconnect SignalR and close DM sessions
      },
      
      refreshToken: async () => {
        const response = await authApi.refresh();
        set({ accessToken: response.accessToken });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        accessToken: state.accessToken,
        // Note: Don't persist sensitive data
      })
    }
  )
);
```

### Server State (React Query)

Used for:
- Server list
- Channel list
- Message history (community)
- Member list
- User profiles

```tsx
// src/features/channels/useChannelMessages.ts
export function useChannelMessages(channelId: string) {
  return useInfiniteQuery({
    queryKey: ['messages', channelId],
    queryFn: ({ pageParam }) => 
      messageApi.getMessages(channelId, { before: pageParam, limit: 50 }),
    getNextPageParam: (lastPage) => 
      lastPage.length === 50 ? lastPage[lastPage.length - 1].id : undefined,
    staleTime: 30_000, // 30 seconds
    refetchOnWindowFocus: false
  });
}
```

### DM State (Zustand - Never Persisted)

```tsx
// src/features/dm/dmStore.ts
interface DMSession {
  peerId: string;
  peerName: string;
  state: DMSessionState;
  connection: RTCPeerConnection | null;
  dataChannel: RTCDataChannel | null;
  messages: DMMessage[]; // RAM only, never persisted
  crypto: DMSessionCrypto | null;
}

interface DMState {
  sessions: Map<string, DMSession>;
  activeSessionId: string | null;
  
  // Actions
  requestSession: (peerId: string) => Promise<void>;
  acceptSession: (peerId: string) => void;
  rejectSession: (peerId: string) => void;
  endSession: (peerId: string) => void;
  sendMessage: (peerId: string, content: string) => Promise<void>;
  
  // Internal
  addMessage: (peerId: string, message: DMMessage) => void;
  setSessionState: (peerId: string, state: DMSessionState) => void;
}

export const useDMStore = create<DMState>()((set, get) => ({
  sessions: new Map(),
  activeSessionId: null,
  
  requestSession: async (peerId) => {
    // Implementation in Phase 4
  },
  
  endSession: (peerId) => {
    const session = get().sessions.get(peerId);
    if (session) {
      // Wipe everything
      session.dataChannel?.close();
      session.connection?.close();
      session.crypto?.destroy();
      session.messages.length = 0;
      
      set(state => {
        state.sessions.delete(peerId);
        return { sessions: new Map(state.sessions) };
      });
    }
  },
  
  // ... other methods
}));

// IMPORTANT: No persist middleware - DM data is NEVER saved
```

---

## SignalR Integration

### Connection Manager

```tsx
// src/services/signalr/hubConnection.ts
import * as signalR from "@microsoft/signalr";

class SignalRService {
  private communityHub: signalR.HubConnection | null = null;
  private signalingHub: signalR.HubConnection | null = null;
  
  async connect(accessToken: string): Promise<void> {
    // Community Hub
    this.communityHub = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/community`, {
        accessTokenFactory: () => accessToken
      })
      .withAutomaticReconnect()
      .build();
    
    // Signaling Hub
    this.signalingHub = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/signaling`, {
        accessTokenFactory: () => accessToken
      })
      .withAutomaticReconnect()
      .build();
    
    await Promise.all([
      this.communityHub.start(),
      this.signalingHub.start()
    ]);
  }
  
  getCommunityHub(): signalR.HubConnection {
    if (!this.communityHub) throw new Error("Not connected");
    return this.communityHub;
  }
  
  getSignalingHub(): signalR.HubConnection {
    if (!this.signalingHub) throw new Error("Not connected");
    return this.signalingHub;
  }
  
  disconnect(): void {
    this.communityHub?.stop();
    this.signalingHub?.stop();
  }
}

export const signalRService = new SignalRService();
```

### Community Hub Handlers

```tsx
// src/services/signalr/communityHub.ts
export function setupCommunityHubHandlers(
  hub: signalR.HubConnection,
  queryClient: QueryClient
) {
  // New message received
  hub.on("ReceiveMessage", (message: MessageDto) => {
    queryClient.setQueryData<InfiniteData<MessageDto[]>>(
      ['messages', message.channelId],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: [[message, ...old.pages[0]], ...old.pages.slice(1)]
        };
      }
    );
  });
  
  // Typing indicator
  hub.on("UserTyping", (userId: string, channelId: string) => {
    // Update typing state
  });
  
  // Presence update
  hub.on("PresenceUpdated", (userId: string, status: PresenceStatus) => {
    queryClient.setQueryData<User>(['user', userId], (old) => 
      old ? { ...old, status } : old
    );
  });
  
  // Member joined server
  hub.on("MemberJoined", (serverId: string, member: MemberDto) => {
    queryClient.invalidateQueries(['server', serverId, 'members']);
  });
}
```

### Signaling Hub Handlers (for WebRTC)

```tsx
// src/services/signalr/signalingHub.ts
export function setupSignalingHubHandlers(
  hub: signalR.HubConnection,
  dmStore: DMState
) {
  // Incoming DM request
  hub.on("DMSessionRequest", (requesterId: string) => {
    dmStore.setSessionState(requesterId, DMSessionState.INCOMING_REQUEST);
    showDMRequestNotification(requesterId);
  });
  
  // DM accepted by peer
  hub.on("DMSessionAccepted", async (peerId: string) => {
    await dmStore.startWebRTCNegotiation(peerId, true); // true = offerer
  });
  
  // WebRTC SDP offer received
  hub.on("ReceiveOffer", async (peerId: string, sdp: string) => {
    await dmStore.handleOffer(peerId, sdp);
  });
  
  // WebRTC SDP answer received
  hub.on("ReceiveAnswer", async (peerId: string, sdp: string) => {
    await dmStore.handleAnswer(peerId, sdp);
  });
  
  // ICE candidate received
  hub.on("ReceiveIceCandidate", async (peerId: string, candidate: string) => {
    await dmStore.handleIceCandidate(peerId, candidate);
  });
  
  // Peer ended session
  hub.on("DMSessionEnded", (peerId: string) => {
    dmStore.endSession(peerId);
    showNotification(`DM session with ${peerId} ended`);
  });
}
```

---

## Key Components

### MessageList (Shared for Community & DM)

```tsx
// src/components/chat/MessageList.tsx
interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isEphemeral?: boolean; // True for DM sessions
}

export function MessageList({
  messages,
  isLoading,
  hasMore,
  onLoadMore,
  isEphemeral = false
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { ref: loadMoreRef, inView } = useInView();
  
  useEffect(() => {
    if (inView && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [inView, hasMore, onLoadMore]);
  
  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto flex flex-col-reverse p-4"
    >
      {isEphemeral && (
        <div className="text-center text-xs text-gray-500 mb-4 p-2 bg-gray-800 rounded">
          🔒 End-to-end encrypted. Messages are not stored and will be lost when 
          session ends.
        </div>
      )}
      
      {messages.map((message, index) => (
        <MessageItem 
          key={message.id} 
          message={message}
          showAuthor={index === 0 || messages[index - 1].authorId !== message.authorId}
        />
      ))}
      
      {hasMore && (
        <div ref={loadMoreRef} className="h-10">
          {isLoading && <LoadingSpinner />}
        </div>
      )}
    </div>
  );
}
```

### DMChatView (Ephemeral Session)

```tsx
// src/components/dm/DMChatView.tsx
export function DMChatView({ peerId }: { peerId: string }) {
  const session = useDMStore(state => state.sessions.get(peerId));
  const sendMessage = useDMStore(state => state.sendMessage);
  
  if (!session) return <DMSessionNotFound />;
  
  return (
    <div className="flex flex-col h-full">
      {/* Connection Status Banner */}
      <SessionIndicator state={session.state} />
      
      {/* Message List - RAM only */}
      <MessageList 
        messages={session.messages}
        isEphemeral={true}
        hasMore={false} // No history to load
      />
      
      {/* Input - disabled if not connected */}
      <MessageInput
        disabled={session.state !== DMSessionState.ACTIVE}
        onSend={(content) => sendMessage(peerId, content)}
        placeholder={
          session.state === DMSessionState.ACTIVE 
            ? "Send an encrypted message..." 
            : "Connecting..."
        }
      />
      
      {/* End Session Button */}
      <button 
        onClick={() => useDMStore.getState().endSession(peerId)}
        className="text-red-500 text-sm p-2"
      >
        End Secure Session
      </button>
    </div>
  );
}
```

### SessionIndicator

```tsx
// src/components/dm/SessionIndicator.tsx
export function SessionIndicator({ state }: { state: DMSessionState }) {
  const statusConfig = {
    [DMSessionState.CONNECTING]: { 
      color: 'yellow', 
      text: 'Establishing secure connection...',
      icon: <Loader className="animate-spin" />
    },
    [DMSessionState.KEY_EXCHANGING]: { 
      color: 'yellow', 
      text: 'Exchanging encryption keys...',
      icon: <Key className="animate-pulse" />
    },
    [DMSessionState.ACTIVE]: { 
      color: 'green', 
      text: 'End-to-end encrypted P2P connection active',
      icon: <Shield className="text-green-500" />
    },
    [DMSessionState.FAILED]: { 
      color: 'red', 
      text: 'Connection failed',
      icon: <XCircle className="text-red-500" />
    }
  };
  
  const config = statusConfig[state];
  
  return (
    <div className={`flex items-center gap-2 p-2 bg-gray-800 text-sm`}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}
```

---

## Routing Structure

```tsx
// src/App.tsx
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              
              {/* Server Routes */}
              <Route path="/servers/:serverId" element={<ServerPage />}>
                <Route path="channels/:channelId" element={<ChannelPage />} />
              </Route>
              
              {/* DM Routes */}
              <Route path="/dm" element={<DMListPage />} />
              <Route path="/dm/:peerId" element={<DMPage />} />
              
              {/* Settings */}
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

---

## Visual Difference: Community vs DM

| Aspect | Community Chat | DM Session |
|--------|---------------|------------|
| **Header Icon** | # (channel hash) | 🔒 (lock icon) |
| **Status Banner** | None | "E2E Encrypted - Session Based" |
| **Message Storage** | Server + infinite scroll history | RAM only - no scroll history |
| **Attachment Handling** | Upload to server | P2P transfer only |
| **Typing Indicator** | Via SignalR | Via DataChannel |
| **Read Receipts** | Via SignalR | Via DataChannel |
| **Session End** | N/A | "End Secure Session" button |
| **Reconnection** | Automatic via SignalR | Must re-initiate session |

---

## Next Phase

Phase 6 will cover non-functional requirements and deployment considerations.
