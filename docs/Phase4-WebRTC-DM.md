# Phase 4 – Direct Messages (P2P WebRTC Session-Based Secure Chat)

## Summary

This phase details the privacy-first DM system. All direct messages are transmitted peer-to-peer via WebRTC DataChannels with optional end-to-end encryption. The server is used only for signaling—no message content ever touches the backend.

---

## DM Session Lifecycle

### Complete Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        DM SESSION LIFECYCLE                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. SESSION REQUEST                                                         │
│  ┌──────────┐                    ┌──────────┐                    ┌────────┐│
│  │  User A  │───RequestDM(B)────▶│  Server  │───DMRequest(A)────▶│ User B ││
│  └──────────┘                    └──────────┘                    └────────┘│
│                                                                             │
│  2. SESSION ACCEPTANCE                                                      │
│  ┌──────────┐                    ┌──────────┐                    ┌────────┐│
│  │  User A  │◀──Accepted(B)──────│  Server  │◀──AcceptDM(A)──────│ User B ││
│  └──────────┘                    └──────────┘                    └────────┘│
│                                                                             │
│  3. KEY EXCHANGE (Application Layer)                                        │
│  ┌──────────┐                                                    ┌────────┐│
│  │  User A  │═══════════ECDH Public Key Exchange══════════════▶│ User B ││
│  │ Generate │                                                    │Generate││
│  │ KeyPair  │◀═══════════════════════════════════════════════════│KeyPair ││
│  │ Derive   │                                                    │ Derive ││
│  │SharedKey │                                                    │SharedK.││
│  └──────────┘                                                    └────────┘│
│                                                                             │
│  4. WEBRTC NEGOTIATION (via Signaling Server)                              │
│  ┌──────────┐      ┌──────────┐                     ┌────────┐             │
│  │  User A  │──────│  Server  │─────────────────────│ User B │             │
│  │          │      │(Relay)   │                     │        │             │
│  │ Create   │      │          │                     │        │             │
│  │ Offer    │─SDP─▶│          │──────SDP Offer────▶ │        │             │
│  │          │      │          │                     │ Create │             │
│  │          │◀─SDP─│          │◀────SDP Answer──────│ Answer │             │
│  │          │      │          │                     │        │             │
│  │          │─ICE─▶│          │──────ICE Cand.────▶ │        │             │
│  │          │◀─ICE─│          │◀─────ICE Cand.──────│        │             │
│  └──────────┘      └──────────┘                     └────────┘             │
│                                                                             │
│  5. P2P CONNECTION ESTABLISHED                                             │
│  ┌──────────┐                                                    ┌────────┐│
│  │  User A  │◀═══════════WebRTC DataChannel (P2P)══════════════▶│ User B ││
│  │          │          [Encrypted Messages + Files]             │        ││
│  │   RAM    │             NO SERVER INVOLVEMENT                 │  RAM   ││
│  │  Buffer  │                                                   │ Buffer ││
│  └──────────┘                                                    └────────┘│
│                                                                             │
│  6. SESSION TERMINATION                                                     │
│  ┌──────────┐                                                    ┌────────┐│
│  │  User A  │────────────EndSession / Disconnect────────────────│ User B ││
│  │          │                                                    │        ││
│  │  WIPE    │           Both peers wipe RAM buffers             │  WIPE  ││
│  │  MEMORY  │           Clear DataChannel references            │ MEMORY ││
│  │  DESTROY │           Destroy session keys                    │DESTROY ││
│  │  KEYS    │                                                    │ KEYS   ││
│  └──────────┘                                                    └────────┘│
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Session Initiation

### User A Initiates DM

```typescript
// Client-side: User A clicks "Message" on User B's profile
async function initiateDMSession(targetUserId: string): Promise<void> {
  // Check if target is online via presence
  if (!isUserOnline(targetUserId)) {
    showError("User is offline. P2P messaging requires both users online.");
    return;
  }
  
  // Send request via SignalR
  await signalingHub.invoke("RequestDMSession", targetUserId);
  
  // Update UI to show "Waiting for acceptance..."
  setSessionState(targetUserId, SessionState.PENDING);
}
```

### User B Receives Request

```typescript
// Client-side: Handler for incoming DM request
signalingHub.on("DMSessionRequest", async (requesterId: string) => {
  // Show notification to User B
  const accepted = await showDMRequestModal(requesterId);
  
  if (accepted) {
    await signalingHub.invoke("AcceptDMSession", requesterId);
    startWebRTCNegotiation(requesterId, false); // false = answerer
  } else {
    await signalingHub.invoke("RejectDMSession", requesterId);
  }
});
```

---

## Phase 2: Session Key Generation (E2E Encryption)

### ECDH Key Exchange

Both peers generate ephemeral ECDH key pairs and exchange public keys to derive a shared secret.

```typescript
// Session key manager
class DMSessionCrypto {
  private keyPair: CryptoKeyPair | null = null;
  private sharedKey: CryptoKey | null = null;
  
  async generateKeyPair(): Promise<string> {
    // Generate ECDH key pair
    this.keyPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey"]
    );
    
    // Export public key for sharing
    const publicKeyRaw = await crypto.subtle.exportKey(
      "raw",
      this.keyPair.publicKey
    );
    return btoa(String.fromCharCode(...new Uint8Array(publicKeyRaw)));
  }
  
  async deriveSharedKey(peerPublicKeyBase64: string): Promise<void> {
    // Import peer's public key
    const peerPublicKeyRaw = Uint8Array.from(
      atob(peerPublicKeyBase64),
      c => c.charCodeAt(0)
    );
    
    const peerPublicKey = await crypto.subtle.importKey(
      "raw",
      peerPublicKeyRaw,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      []
    );
    
    // Derive AES-GCM key from shared secret
    this.sharedKey = await crypto.subtle.deriveKey(
      { name: "ECDH", public: peerPublicKey },
      this.keyPair!.privateKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }
  
  async encrypt(plaintext: string): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      this.sharedKey!,
      encoded
    );
    
    // Prepend IV to ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  async decrypt(ciphertextBase64: string): Promise<string> {
    const combined = Uint8Array.from(
      atob(ciphertextBase64),
      c => c.charCodeAt(0)
    );
    
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      this.sharedKey!,
      ciphertext
    );
    
    return new TextDecoder().decode(plaintext);
  }
  
  destroy(): void {
    // Wipe key material
    this.keyPair = null;
    this.sharedKey = null;
  }
}
```

### Key Exchange Protocol

```typescript
// Exchange happens over the initial DataChannel or as part of WebRTC setup
async function exchangeSessionKeys(
  dataChannel: RTCDataChannel,
  crypto: DMSessionCrypto
): Promise<void> {
  // Generate our key pair
  const myPublicKey = await crypto.generateKeyPair();
  
  // Send our public key
  dataChannel.send(JSON.stringify({
    type: "KEY_EXCHANGE",
    publicKey: myPublicKey
  }));
  
  // Wait for peer's public key
  return new Promise((resolve) => {
    const handler = async (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      if (message.type === "KEY_EXCHANGE") {
        await crypto.deriveSharedKey(message.publicKey);
        dataChannel.removeEventListener("message", handler);
        resolve();
      }
    };
    dataChannel.addEventListener("message", handler);
  });
}
```

---

## Phase 3: WebRTC Connection

### STUN/TURN Configuration

```typescript
const rtcConfig: RTCConfiguration = {
  iceServers: [
    // Public STUN servers (for NAT traversal)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    
    // Self-hosted or third-party TURN server (for symmetric NAT fallback)
    {
      urls: "turn:turn.thiscord.app:3478",
      username: "thiscord",
      credential: "turn-secret-from-config"
    }
  ],
  iceCandidatePoolSize: 10
};
```

### WebRTC Peer Connection Setup

```typescript
class DMPeerConnection {
  private pc: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private crypto: DMSessionCrypto;
  private messageBuffer: DMMessage[] = []; // RAM only
  private onMessage: (msg: DMMessage) => void;
  
  constructor(config: RTCConfiguration, onMessage: (msg: DMMessage) => void) {
    this.pc = new RTCPeerConnection(config);
    this.crypto = new DMSessionCrypto();
    this.onMessage = onMessage;
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    // ICE candidate handling
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalingHub.invoke(
          "SendIceCandidate",
          this.peerId,
          JSON.stringify(event.candidate)
        );
      }
    };
    
    // Connection state monitoring
    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === "disconnected" ||
          this.pc.connectionState === "failed") {
        this.handleDisconnection();
      }
    };
    
    // Incoming data channel (for answerer)
    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };
  }
  
  // Offerer creates the data channel
  async createOffer(): Promise<string> {
    this.dataChannel = this.pc.createDataChannel("dm-channel", {
      ordered: true // Guarantee message order
    });
    this.setupDataChannel();
    
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    
    return JSON.stringify(offer);
  }
  
  // Answerer processes offer and creates answer
  async processOffer(offerSdp: string): Promise<string> {
    const offer = JSON.parse(offerSdp);
    await this.pc.setRemoteDescription(offer);
    
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    
    return JSON.stringify(answer);
  }
  
  async processAnswer(answerSdp: string): Promise<void> {
    const answer = JSON.parse(answerSdp);
    await this.pc.setRemoteDescription(answer);
  }
  
  async addIceCandidate(candidateJson: string): Promise<void> {
    const candidate = JSON.parse(candidateJson);
    await this.pc.addIceCandidate(candidate);
  }
  
  private setupDataChannel(): void {
    if (!this.dataChannel) return;
    
    this.dataChannel.onopen = async () => {
      // Perform key exchange once channel is open
      await exchangeSessionKeys(this.dataChannel!, this.crypto);
      console.log("DM session ready - E2E encrypted");
    };
    
    this.dataChannel.onmessage = async (event) => {
      const encrypted = JSON.parse(event.data);
      
      if (encrypted.type === "KEY_EXCHANGE") {
        return; // Handled separately
      }
      
      // Decrypt message
      const plaintext = await this.crypto.decrypt(encrypted.payload);
      const message: DMMessage = JSON.parse(plaintext);
      
      // Store in RAM buffer only
      this.messageBuffer.push(message);
      this.onMessage(message);
    };
    
    this.dataChannel.onclose = () => {
      this.handleDisconnection();
    };
  }
  
  async sendMessage(content: string, type: "text" | "file" = "text"): Promise<void> {
    const message: DMMessage = {
      id: crypto.randomUUID(),
      type,
      content,
      timestamp: Date.now(),
      sender: getCurrentUserId()
    };
    
    // Store locally in RAM
    this.messageBuffer.push(message);
    
    // Encrypt and send
    const encrypted = await this.crypto.encrypt(JSON.stringify(message));
    this.dataChannel!.send(JSON.stringify({ type: "MESSAGE", payload: encrypted }));
  }
  
  private handleDisconnection(): void {
    // Wipe all message data
    this.destroy();
  }
  
  destroy(): void {
    // Close data channel
    this.dataChannel?.close();
    this.dataChannel = null;
    
    // Close peer connection
    this.pc.close();
    
    // Wipe encryption keys
    this.crypto.destroy();
    
    // Clear message buffer
    this.messageBuffer.length = 0;
    this.messageBuffer = [];
    
    console.log("DM session destroyed - all data wiped from RAM");
  }
}
```

---

## Message Protocol

### Message Types

```typescript
interface DMMessage {
  id: string;
  type: "text" | "file" | "typing" | "read_receipt";
  content: string;
  timestamp: number;
  sender: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  };
}

// Wire format (encrypted)
interface EncryptedPayload {
  type: "MESSAGE" | "KEY_EXCHANGE";
  payload: string; // Base64 encrypted content
}
```

### File Transfer

Files are chunked and sent over DataChannel:

```typescript
async function sendFile(file: File, peer: DMPeerConnection): Promise<void> {
  const CHUNK_SIZE = 16 * 1024; // 16KB chunks
  const reader = file.stream().getReader();
  
  // Send file metadata first
  await peer.sendMessage(JSON.stringify({
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    chunks: Math.ceil(file.size / CHUNK_SIZE)
  }), "file");
  
  let chunkIndex = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    // Send chunk (encrypted via normal message flow)
    await peer.sendMessage(btoa(String.fromCharCode(...value)), "file_chunk");
    chunkIndex++;
  }
}
```

---

## Privacy Guarantees

### What IS Protected

| Threat | Mitigation |
|--------|------------|
| Server reading DM content | Messages never touch server |
| Server logging DM metadata | Only connection info logged, not content |
| Database breach exposing DMs | No DMs in database |
| Man-in-the-middle (passive) | WebRTC DTLS + application-layer E2E encryption |
| Session key reuse | Fresh ECDH keys per session |
| Message persistence | RAM-only storage, wiped on session end |

### What is NOT Protected

| Threat | Status | Notes |
|--------|--------|-------|
| Compromised client device | Not protected | Keylogger, screen capture |
| Screenshot by peer | Not protected | Social trust issue |
| Malicious client build | Not protected | Must trust the app |
| Active MITM with key injection | Partially protected | Could add key fingerprint verification |
| Metadata (who talks to whom) | Partially exposed | Signaling reveals connection attempts |
| Offline attacks on captured traffic | Protected | Forward secrecy via ephemeral keys |

---

## Threat Model

### Assumptions

1. **Server is honest-but-curious**: Server follows protocol but may try to observe data
2. **Signaling is observable**: Server can see who initiates DMs with whom
3. **Clients are trusted**: Users run legitimate ThisCord clients
4. **WebRTC infra is secure**: STUN/TURN servers don't record traffic

### Attack Vectors and Mitigations

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           THREAT ANALYSIS                                │
├──────────────────────────┬─────────────────┬────────────────────────────┤
│ Attack Vector            │ Risk Level      │ Mitigation                 │
├──────────────────────────┼─────────────────┼────────────────────────────┤
│ Server reads DM content  │ Eliminated      │ P2P, no server relay       │
│ Database breach          │ Eliminated      │ No DM storage              │
│ Network eavesdropping    │ Very Low        │ DTLS + AES-GCM             │
│ Replay attacks           │ Low             │ Unique message IDs + nonce │
│ Session hijacking        │ Low             │ Ephemeral keys per session │
│ Denial of service        │ Medium          │ Rate limiting on signaling │
│ Metadata correlation     │ Medium          │ Accept as trade-off        │
│ Malicious peer           │ High (inherent) │ Social trust required      │
│ Compromised endpoint     │ High (inherent) │ Out of scope               │
└──────────────────────────┴─────────────────┴────────────────────────────┘
```

### Optional Enhancements (Future)

1. **Key Fingerprint Verification**: Show users a visual fingerprint to verify out-of-band
2. **SAS (Short Authentication String)**: Audio verification of session key
3. **Message signing**: Prove message authenticity with signing keys
4. **Deniability**: Use OTR-style deniable encryption

---

## Session State Management

```typescript
enum DMSessionState {
  IDLE = "idle",
  REQUESTING = "requesting",
  INCOMING_REQUEST = "incoming_request",
  CONNECTING = "connecting",
  KEY_EXCHANGING = "key_exchanging",
  ACTIVE = "active",
  DISCONNECTING = "disconnecting",
  FAILED = "failed"
}

interface DMSession {
  peerId: string;
  peerName: string;
  state: DMSessionState;
  connection: DMPeerConnection | null;
  messages: DMMessage[]; // RAM only
  startedAt: number | null;
}

// React state management
const DMSessionContext = createContext<{
  sessions: Map<string, DMSession>;
  startSession: (peerId: string) => Promise<void>;
  endSession: (peerId: string) => void;
  sendMessage: (peerId: string, content: string) => Promise<void>;
}>(null!);
```

---

## Error Handling

```typescript
// Common WebRTC failure scenarios
async function handleConnectionFailure(
  session: DMSession,
  error: Error
): Promise<void> {
  console.error("DM connection failed:", error);
  
  if (error.message.includes("ICE failed")) {
    // NAT traversal failed
    showError(
      "Could not establish direct connection. " +
      "This may happen with certain network configurations. " +
      "Please try again or use a different network."
    );
  } else if (error.message.includes("timeout")) {
    showError("Connection timed out. The other user may have gone offline.");
  } else {
    showError("Connection failed. Please try again.");
  }
  
  // Clean up
  session.connection?.destroy();
  session.state = DMSessionState.FAILED;
}
```

---

## Privacy-Preserving Logging

```csharp
// Backend: Never log DM content
public class SignalingHub : Hub
{
    private readonly ILogger<SignalingHub> _logger;
    
    public async Task SendOffer(Guid targetUserId, string sdpOffer)
    {
        // Log action but NOT content
        _logger.LogInformation(
            "User {UserId} sending SDP offer to {TargetUserId}",
            Context.UserIdentifier,
            targetUserId
            // NEVER log sdpOffer content
        );
        
        // Relay without inspection
        await RelayToUser(targetUserId, "ReceiveOffer", sdpOffer);
    }
}
```

---

## Next Phase

Phase 5 will detail the React frontend architecture, component structure, and integration of both community and DM features.
