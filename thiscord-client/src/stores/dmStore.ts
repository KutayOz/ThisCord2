import { create } from 'zustand';
import type { User } from '../types';

export type DMSessionStatus =
  | 'idle'
  | 'requesting'
  | 'incoming'
  | 'connecting'
  | 'active'
  | 'ended'
  | 'failed';

export type DMMessageType = 'text' | 'file' | 'system';

export interface DMFilePayload {
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
}

export interface DMMessage {
  id: string;
  type: DMMessageType;
  senderId: string;
  timestamp: number;
  content?: string;
  file?: DMFilePayload;
}

export interface DMSession {
  peer: User;
  status: DMSessionStatus;
  isOfferer: boolean;
  messages: DMMessage[];
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

interface DMState {
  sessions: Record<string, DMSession>;
  selectedPeerId: string | null;
  incomingRequestPeerId: string | null;

  selectPeer: (peerId: string | null) => void;
  upsertSession: (peer: User, patch?: Partial<DMSession>) => void;
  setSessionStatus: (peerId: string, status: DMSessionStatus) => void;
  addMessage: (peerId: string, message: DMMessage) => void;
  setIncomingRequest: (peerId: string | null) => void;
  setStreams: (peerId: string, local: MediaStream | null, remote: MediaStream | null) => void;
  clearSession: (peerId: string) => void;
}

export const useDmStore = create<DMState>((set) => ({
  sessions: {},
  selectedPeerId: null,
  incomingRequestPeerId: null,

  selectPeer: (peerId) => set({ selectedPeerId: peerId }),

  upsertSession: (peer, patch) => set((state) => {
    const existing = state.sessions[peer.id];
    const session: DMSession = {
      peer,
      status: existing?.status ?? 'idle',
      isOfferer: existing?.isOfferer ?? false,
      messages: existing?.messages ?? [],
      localStream: existing?.localStream ?? null,
      remoteStream: existing?.remoteStream ?? null,
      ...patch,
    };

    return {
      sessions: {
        ...state.sessions,
        [peer.id]: session,
      },
    };
  }),

  setSessionStatus: (peerId, status) => set((state) => {
    const existing = state.sessions[peerId];
    if (!existing) return state;

    return {
      sessions: {
        ...state.sessions,
        [peerId]: {
          ...existing,
          status,
        },
      },
    };
  }),

  addMessage: (peerId, message) => set((state) => {
    const existing = state.sessions[peerId];
    if (!existing) return state;

    if (existing.messages.some((m) => m.id === message.id)) return state;

    return {
      sessions: {
        ...state.sessions,
        [peerId]: {
          ...existing,
          messages: [...existing.messages, message],
        },
      },
    };
  }),

  setIncomingRequest: (peerId) => set({ incomingRequestPeerId: peerId }),

  setStreams: (peerId, local, remote) => set((state) => {
    const existing = state.sessions[peerId];
    if (!existing) return state;

    return {
      sessions: {
        ...state.sessions,
        [peerId]: {
          ...existing,
          localStream: local,
          remoteStream: remote,
        },
      },
    };
  }),

  clearSession: (peerId) => set((state) => {
    const { [peerId]: _, ...rest } = state.sessions;

    const selectedPeerId = state.selectedPeerId === peerId ? null : state.selectedPeerId;
    const incomingRequestPeerId = state.incomingRequestPeerId === peerId ? null : state.incomingRequestPeerId;

    return {
      sessions: rest,
      selectedPeerId,
      incomingRequestPeerId,
    };
  }),
}));
