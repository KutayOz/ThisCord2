import { create } from 'zustand';
import type { User } from '../types';

export type VoiceStatus = 'idle' | 'joining' | 'active' | 'ended' | 'failed';

export interface VoiceParticipant {
  user: User;
  stream: MediaStream | null;
}

interface VoiceState {
  channelId: string | null;
  status: VoiceStatus;
  localStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  participants: Record<string, VoiceParticipant>;

  setChannel: (channelId: string | null) => void;
  setStatus: (status: VoiceStatus) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setMuted: (muted: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  upsertParticipant: (user: User) => void;
  removeParticipant: (userId: string) => void;
  setParticipantStream: (userId: string, stream: MediaStream | null) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  channelId: null,
  status: 'idle',
  localStream: null,
  isMuted: false,
  isVideoEnabled: false,
  participants: {},

  setChannel: (channelId) => set({ channelId }),
  setStatus: (status) => set({ status }),
  setLocalStream: (localStream) => set({ localStream }),
  setMuted: (isMuted) => set({ isMuted }),
  setVideoEnabled: (isVideoEnabled) => set({ isVideoEnabled }),

  upsertParticipant: (user) =>
    set((state) => {
      const existing = state.participants[user.id];
      return {
        participants: {
          ...state.participants,
          [user.id]: {
            user,
            stream: existing?.stream ?? null,
          },
        },
      };
    }),

  removeParticipant: (userId) =>
    set((state) => {
      const { [userId]: _, ...rest } = state.participants;
      return { participants: rest };
    }),

  setParticipantStream: (userId, stream) =>
    set((state) => {
      const existing = state.participants[userId];
      if (!existing) return state;

      return {
        participants: {
          ...state.participants,
          [userId]: {
            ...existing,
            stream,
          },
        },
      };
    }),

  reset: () =>
    set({
      channelId: null,
      status: 'idle',
      localStream: null,
      isMuted: false,
      isVideoEnabled: false,
      participants: {},
    }),
}));
