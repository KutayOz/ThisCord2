import { getSignalingHub } from './hubs';
import { useAuthStore } from '../stores/authStore';
import { useDmStore } from '../stores/dmStore';
import { usersApi } from '../api/users';

type IncomingFileState = {
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  chunks: string[];
};

type PeerState = {
  pc: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  pendingIce: RTCIceCandidateInit[];
  incomingFiles: Map<string, IncomingFileState>;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  negotiationLock: boolean;
};

const peers = new Map<string, PeerState>();
let initialized = false;

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

function ensurePeerState(peerId: string): PeerState {
  const existing = peers.get(peerId);
  if (existing) return existing;

  const pc = new RTCPeerConnection(rtcConfig);
  const state: PeerState = {
    pc,
    dataChannel: null,
    pendingIce: [],
    incomingFiles: new Map(),
    localStream: null,
    remoteStream: null,
    negotiationLock: false,
  };

  pc.onicecandidate = async (event) => {
    if (!event.candidate) return;
    try {
      const hub = await getSignalingHub();
      await hub.invoke('SendIceCandidate', peerId, JSON.stringify(event.candidate));
    } catch {
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      useDmStore.getState().setSessionStatus(peerId, 'failed');
    }
  };

  pc.ondatachannel = (event) => {
    state.dataChannel = event.channel;
    setupDataChannel(peerId, state, event.channel);
  };

  pc.ontrack = (event) => {
    if (!state.remoteStream) {
      state.remoteStream = new MediaStream();
    }
    event.streams[0]?.getTracks().forEach((t) => {
      if (!state.remoteStream!.getTracks().some((rt) => rt.id === t.id)) {
        state.remoteStream!.addTrack(t);
      }
    });

    useDmStore.getState().setStreams(peerId, state.localStream, state.remoteStream);
  };

  peers.set(peerId, state);
  return state;
}

function setupDataChannel(peerId: string, state: PeerState, channel: RTCDataChannel): void {
  channel.onopen = () => {
    useDmStore.getState().setSessionStatus(peerId, 'active');
  };

  channel.onclose = () => {
    useDmStore.getState().setSessionStatus(peerId, 'ended');
  };

  channel.onmessage = (event) => {
    if (typeof event.data !== 'string') return;

    try {
      const payload = JSON.parse(event.data) as any;
      if (payload?.t === 'text') {
        useDmStore.getState().addMessage(peerId, {
          id: payload.id,
          type: 'text',
          senderId: payload.senderId,
          timestamp: payload.ts,
          content: payload.content,
        });
        return;
      }

      if (payload?.t === 'file-meta') {
        state.incomingFiles.set(payload.id, {
          fileName: payload.fileName,
          fileSize: payload.fileSize,
          mimeType: payload.mimeType,
          totalChunks: payload.totalChunks,
          chunks: new Array(payload.totalChunks).fill(''),
        });
        return;
      }

      if (payload?.t === 'file-chunk') {
        const incoming = state.incomingFiles.get(payload.id);
        if (!incoming) return;

        incoming.chunks[payload.index] = payload.data;

        if (incoming.chunks.every((c) => c.length > 0)) {
          const bytesParts: Uint8Array[] = [];
          for (const chunk of incoming.chunks) {
            const bin = atob(chunk);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            bytesParts.push(bytes);
          }

          const totalSize = bytesParts.reduce((sum, p) => sum + p.length, 0);
          const joined = new Uint8Array(totalSize);
          let offset = 0;
          for (const part of bytesParts) {
            joined.set(part, offset);
            offset += part.length;
          }

          const blob = new Blob([joined], { type: incoming.mimeType || 'application/octet-stream' });
          const url = URL.createObjectURL(blob);

          useDmStore.getState().addMessage(peerId, {
            id: payload.id,
            type: 'file',
            senderId: payload.senderId,
            timestamp: payload.ts,
            file: {
              fileName: incoming.fileName,
              fileSize: incoming.fileSize,
              mimeType: incoming.mimeType,
              url,
            },
          });

          state.incomingFiles.delete(payload.id);
        }

        return;
      }
    } catch {
    }
  };
}

async function createAndSendOffer(peerId: string): Promise<void> {
  const state = ensurePeerState(peerId);
  if (state.negotiationLock) return;

  state.negotiationLock = true;
  try {
    const hub = await getSignalingHub();
    const offer = await state.pc.createOffer();
    await state.pc.setLocalDescription(offer);
    await hub.invoke('SendOffer', peerId, JSON.stringify(state.pc.localDescription));
  } finally {
    state.negotiationLock = false;
  }
}

async function applyPendingIce(peerId: string): Promise<void> {
  const state = peers.get(peerId);
  if (!state) return;

  if (!state.pc.remoteDescription) return;

  const pending = [...state.pendingIce];
  state.pendingIce.length = 0;

  for (const cand of pending) {
    try {
      await state.pc.addIceCandidate(cand);
    } catch {
    }
  }
}

export async function initDmService(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const hub = await getSignalingHub();

  hub.on('DMSessionRequest', async (requesterId: string) => {
    try {
      const requester = await usersApi.getById(requesterId);
      useDmStore.getState().upsertSession(requester, { status: 'incoming', isOfferer: false });
      useDmStore.getState().setIncomingRequest(requesterId);
    } catch {
    }
  });

  hub.on('DMSessionAccepted', async (peerId: string) => {
    const existing = useDmStore.getState().sessions[peerId];
    if (!existing) {
      try {
        const peer = await usersApi.getById(peerId);
        useDmStore.getState().upsertSession(peer, { status: 'connecting', isOfferer: true });
      } catch {
        return;
      }
    } else {
      useDmStore.getState().setSessionStatus(peerId, 'connecting');
      useDmStore.getState().upsertSession(existing.peer, { isOfferer: true });
    }

    const state = ensurePeerState(peerId);
    if (!state.dataChannel) {
      state.dataChannel = state.pc.createDataChannel('dm');
      setupDataChannel(peerId, state, state.dataChannel);
    }

    await createAndSendOffer(peerId);
  });

  hub.on('DMSessionRejected', (peerId: string) => {
    useDmStore.getState().setSessionStatus(peerId, 'failed');
  });

  hub.on('DMSessionError', (message: string) => {
    const currentPeerId = useDmStore.getState().selectedPeerId;
    if (!currentPeerId) return;

    useDmStore.getState().addMessage(currentPeerId, {
      id: crypto.randomUUID(),
      type: 'system',
      senderId: useAuthStore.getState().user?.id || 'system',
      timestamp: Date.now(),
      content: message,
    });

    useDmStore.getState().setSessionStatus(currentPeerId, 'failed');
  });

  hub.on('ReceiveOffer', async (senderId: string, sdpOffer: string) => {
    const state = ensurePeerState(senderId);

    try {
      const offer = JSON.parse(sdpOffer) as RTCSessionDescriptionInit;
      await state.pc.setRemoteDescription(offer);

      await applyPendingIce(senderId);

      const answer = await state.pc.createAnswer();
      await state.pc.setLocalDescription(answer);

      await hub.invoke('SendAnswer', senderId, JSON.stringify(state.pc.localDescription));

      useDmStore.getState().setSessionStatus(senderId, 'connecting');
    } catch {
      useDmStore.getState().setSessionStatus(senderId, 'failed');
    }
  });

  hub.on('ReceiveAnswer', async (senderId: string, sdpAnswer: string) => {
    const state = peers.get(senderId);
    if (!state) return;

    try {
      const answer = JSON.parse(sdpAnswer) as RTCSessionDescriptionInit;
      await state.pc.setRemoteDescription(answer);
      await applyPendingIce(senderId);
    } catch {
      useDmStore.getState().setSessionStatus(senderId, 'failed');
    }
  });

  hub.on('ReceiveIceCandidate', async (senderId: string, iceCandidate: string) => {
    const state = ensurePeerState(senderId);
    try {
      const cand = JSON.parse(iceCandidate) as RTCIceCandidateInit;
      if (!state.pc.remoteDescription) {
        state.pendingIce.push(cand);
        return;
      }
      await state.pc.addIceCandidate(cand);
    } catch {
    }
  });

  hub.on('DMSessionEnded', (peerId: string) => {
    teardownPeer(peerId);
    useDmStore.getState().setSessionStatus(peerId, 'ended');
  });

  hub.on('PeerDisconnected', (peerId: string) => {
    teardownPeer(peerId);
    useDmStore.getState().setSessionStatus(peerId, 'ended');
  });
}

function teardownPeer(peerId: string): void {
  const state = peers.get(peerId);
  if (!state) return;

  try {
    state.dataChannel?.close();
  } catch {
  }

  try {
    state.pc.close();
  } catch {
  }

  try {
    state.localStream?.getTracks().forEach((t) => t.stop());
  } catch {
  }

  peers.delete(peerId);
  useDmStore.getState().setStreams(peerId, null, null);
}

export async function requestDMSession(peerId: string): Promise<void> {
  const hub = await getSignalingHub();
  await hub.invoke('RequestDMSession', peerId);
}

export async function acceptDMSession(peerId: string): Promise<void> {
  const hub = await getSignalingHub();
  await hub.invoke('AcceptDMSession', peerId);
}

export async function rejectDMSession(peerId: string): Promise<void> {
  const hub = await getSignalingHub();
  await hub.invoke('RejectDMSession', peerId);
}

export async function endDMSession(peerId: string): Promise<void> {
  const hub = await getSignalingHub();
  try {
    await hub.invoke('EndDMSession', peerId);
  } catch {
  }

  teardownPeer(peerId);
  useDmStore.getState().setSessionStatus(peerId, 'ended');
}

export function sendDmText(peerId: string, content: string): void {
  const state = peers.get(peerId);
  if (!state?.dataChannel || state.dataChannel.readyState !== 'open') return;

  const userId = useAuthStore.getState().user?.id || '';
  const payload = {
    t: 'text',
    id: crypto.randomUUID(),
    senderId: userId,
    ts: Date.now(),
    content,
  };

  state.dataChannel.send(JSON.stringify(payload));

  useDmStore.getState().addMessage(peerId, {
    id: payload.id,
    type: 'text',
    senderId: payload.senderId,
    timestamp: payload.ts,
    content: payload.content,
  });
}

async function waitForBufferDrain(dc: RTCDataChannel, threshold: number = 64 * 1024): Promise<void> {
  if (dc.bufferedAmount <= threshold) return;

  return new Promise((resolve) => {
    const checkBuffer = () => {
      if (dc.bufferedAmount <= threshold) {
        resolve();
      } else {
        setTimeout(checkBuffer, 10);
      }
    };
    checkBuffer();
  });
}

export async function sendDmFile(peerId: string, file: File): Promise<void> {
  const state = peers.get(peerId);
  if (!state?.dataChannel || state.dataChannel.readyState !== 'open') {
    console.warn('[DM] Cannot send file: DataChannel not open');
    return;
  }

  const dc = state.dataChannel;
  const userId = useAuthStore.getState().user?.id || '';
  const id = crypto.randomUUID();

  const array = new Uint8Array(await file.arrayBuffer());
  const chunkSize = 16 * 1024;
  const totalChunks = Math.ceil(array.length / chunkSize);

  try {
    dc.send(JSON.stringify({
      t: 'file-meta',
      id,
      senderId: userId,
      ts: Date.now(),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      totalChunks,
    }));

    for (let index = 0; index < totalChunks; index++) {
      await waitForBufferDrain(dc);

      if (dc.readyState !== 'open') {
        console.warn('[DM] DataChannel closed during file transfer');
        return;
      }

      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, array.length);
      const chunk = array.slice(start, end);
      const b64 = btoa(String.fromCharCode(...chunk));

      dc.send(JSON.stringify({
        t: 'file-chunk',
        id,
        senderId: userId,
        ts: Date.now(),
        index,
        data: b64,
      }));
    }

    const blob = new Blob([array], { type: file.type || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    useDmStore.getState().addMessage(peerId, {
      id,
      type: 'file',
      senderId: userId,
      timestamp: Date.now(),
      file: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        url,
      },
    });
  } catch (err) {
    console.error('[DM] Error sending file:', err);
  }
}

export async function startDmCall(peerId: string, withVideo: boolean): Promise<void> {
  const state = peers.get(peerId);
  if (!state) {
    console.warn('[DM] Cannot start call: No peer connection');
    return;
  }

  const constraints: MediaStreamConstraints = withVideo
    ? { audio: true, video: true }
    : { audio: true, video: false };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    state.localStream = stream;

    stream.getTracks().forEach((track) => {
      state.pc.addTrack(track, stream);
    });

    useDmStore.getState().setStreams(peerId, state.localStream, state.remoteStream);

    await createAndSendOffer(peerId);
  } catch (err) {
    console.error('[DM] Error starting call:', err);
    useDmStore.getState().addMessage(peerId, {
      id: crypto.randomUUID(),
      type: 'system',
      senderId: 'system',
      timestamp: Date.now(),
      content: `Failed to start ${withVideo ? 'video' : 'voice'} call: ${err instanceof Error ? err.message : 'Unknown error'}`,
    });
  }
}

export async function stopDmCall(peerId: string): Promise<void> {
  const state = peers.get(peerId);
  if (!state) return;

  try {
    state.localStream?.getTracks().forEach((t) => t.stop());
  } catch {
  }

  state.localStream = null;
  useDmStore.getState().setStreams(peerId, null, state.remoteStream);

  try {
    for (const sender of state.pc.getSenders()) {
      if (sender.track) {
        await sender.replaceTrack(null);
      }
    }
  } catch {
  }

  await createAndSendOffer(peerId);
}
