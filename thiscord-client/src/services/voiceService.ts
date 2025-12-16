import { getVoiceHub } from './hubs';
import { useAuthStore } from '../stores/authStore';
import { useVoiceStore } from '../stores/voiceStore';
import { usersApi } from '../api/users';

type VoicePeerState = {
  pc: RTCPeerConnection;
  pendingIce: RTCIceCandidateInit[];
  remoteStream: MediaStream | null;
};

const peers = new Map<string, VoicePeerState>();
let initialized = false;

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

function ensurePeer(peerId: string): VoicePeerState {
  const existing = peers.get(peerId);
  if (existing) return existing;

  const pc = new RTCPeerConnection(rtcConfig);
  const state: VoicePeerState = {
    pc,
    pendingIce: [],
    remoteStream: null,
  };

  const localStream = useVoiceStore.getState().localStream;
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });
  }

  pc.onicecandidate = async (event) => {
    if (!event.candidate) return;

    const channelId = useVoiceStore.getState().channelId;
    if (!channelId) return;

    try {
      const hub = await getVoiceHub();
      await hub.invoke('SendVoiceIceCandidate', channelId, peerId, JSON.stringify(event.candidate));
    } catch {
    }
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

    useVoiceStore.getState().setParticipantStream(peerId, state.remoteStream);
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed') {
      useVoiceStore.getState().setStatus('failed');
    }
  };

  peers.set(peerId, state);
  return state;
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

async function createAndSendOffer(peerId: string): Promise<void> {
  const channelId = useVoiceStore.getState().channelId;
  if (!channelId) return;

  const state = ensurePeer(peerId);
  const hub = await getVoiceHub();

  const offer = await state.pc.createOffer();
  await state.pc.setLocalDescription(offer);

  await hub.invoke('SendVoiceOffer', channelId, peerId, JSON.stringify(state.pc.localDescription));
}

function teardownPeer(peerId: string): void {
  const state = peers.get(peerId);
  if (!state) return;

  try {
    state.pc.getSenders().forEach((s) => {
      try {
        if (s.track) s.track.stop();
      } catch {
      }
    });
  } catch {
  }

  try {
    state.pc.close();
  } catch {
  }

  peers.delete(peerId);
}

function teardownAllPeers(): void {
  for (const peerId of peers.keys()) {
    teardownPeer(peerId);
  }
}

export async function initVoiceService(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const hub = await getVoiceHub();

  hub.on('VoiceParticipants', async (channelId: string, participantIds: string[]) => {
    if (useVoiceStore.getState().channelId !== channelId) return;

    for (const peerId of participantIds) {
      try {
        const user = await usersApi.getById(peerId);
        useVoiceStore.getState().upsertParticipant(user);
      } catch {
      }
    }

    for (const peerId of participantIds) {
      try {
        await createAndSendOffer(peerId);
      } catch {
      }
    }
  });

  hub.on('VoiceUserJoined', async (channelId: string, userId: string) => {
    if (useVoiceStore.getState().channelId !== channelId) return;

    try {
      const user = await usersApi.getById(userId);
      useVoiceStore.getState().upsertParticipant(user);
    } catch {
    }
  });

  hub.on('VoiceUserLeft', (channelId: string, userId: string) => {
    if (useVoiceStore.getState().channelId !== channelId) return;

    teardownPeer(userId);
    useVoiceStore.getState().removeParticipant(userId);
  });

  hub.on('VoiceReceiveOffer', async (channelId: string, senderId: string, sdpOffer: string) => {
    if (useVoiceStore.getState().channelId !== channelId) return;

    if (!useVoiceStore.getState().participants[senderId]) {
      try {
        const user = await usersApi.getById(senderId);
        useVoiceStore.getState().upsertParticipant(user);
      } catch {
      }
    }

    const state = ensurePeer(senderId);

    try {
      const offer = JSON.parse(sdpOffer) as RTCSessionDescriptionInit;
      await state.pc.setRemoteDescription(offer);
      await applyPendingIce(senderId);

      const answer = await state.pc.createAnswer();
      await state.pc.setLocalDescription(answer);

      const hub = await getVoiceHub();
      await hub.invoke('SendVoiceAnswer', channelId, senderId, JSON.stringify(state.pc.localDescription));
    } catch {
      useVoiceStore.getState().setStatus('failed');
    }
  });

  hub.on('VoiceReceiveAnswer', async (channelId: string, senderId: string, sdpAnswer: string) => {
    if (useVoiceStore.getState().channelId !== channelId) return;

    const state = peers.get(senderId);
    if (!state) return;

    try {
      const answer = JSON.parse(sdpAnswer) as RTCSessionDescriptionInit;
      await state.pc.setRemoteDescription(answer);
      await applyPendingIce(senderId);
    } catch {
      useVoiceStore.getState().setStatus('failed');
    }
  });

  hub.on('VoiceReceiveIceCandidate', async (channelId: string, senderId: string, iceCandidate: string) => {
    if (useVoiceStore.getState().channelId !== channelId) return;

    const state = ensurePeer(senderId);

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
}

export async function joinVoiceChannel(channelId: string): Promise<void> {
  await initVoiceService();

  const current = useVoiceStore.getState().channelId;
  if (current && current !== channelId) {
    await leaveVoiceChannel(current);
  }

  if (useVoiceStore.getState().channelId === channelId && useVoiceStore.getState().status === 'active') {
    return;
  }

  useVoiceStore.getState().setChannel(channelId);
  useVoiceStore.getState().setStatus('joining');

  let stream: MediaStream;
  let videoEnabled = true;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  } catch {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    videoEnabled = false;
  }

  useVoiceStore.getState().setLocalStream(stream);
  useVoiceStore.getState().setMuted(false);
  useVoiceStore.getState().setVideoEnabled(videoEnabled);

  try {
    const hub = await getVoiceHub();
    await hub.invoke('JoinVoiceChannel', channelId);
    useVoiceStore.getState().setStatus('active');
  } catch {
    useVoiceStore.getState().setStatus('failed');
  }
}

export async function leaveVoiceChannel(channelId?: string): Promise<void> {
  const current = channelId ?? useVoiceStore.getState().channelId;
  if (!current) return;

  try {
    const hub = await getVoiceHub();
    await hub.invoke('LeaveVoiceChannel', current);
  } catch {
  }

  teardownAllPeers();

  try {
    useVoiceStore.getState().localStream?.getTracks().forEach((t) => t.stop());
  } catch {
  }

  useVoiceStore.getState().reset();
}

export function setVoiceMuted(muted: boolean): void {
  const stream = useVoiceStore.getState().localStream;
  if (stream) {
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  useVoiceStore.getState().setMuted(muted);
}

export function setVoiceVideoEnabled(enabled: boolean): void {
  const stream = useVoiceStore.getState().localStream;
  if (stream) {
    stream.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }

  useVoiceStore.getState().setVideoEnabled(enabled);
}

export function isInVoiceChannel(): boolean {
  return useVoiceStore.getState().status === 'active' && !!useVoiceStore.getState().channelId;
}

export function getCurrentVoiceChannelId(): string | null {
  return useVoiceStore.getState().channelId;
}

export function getCurrentUserId(): string {
  return useAuthStore.getState().user?.id || '';
}
