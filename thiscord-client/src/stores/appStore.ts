import { create } from 'zustand';
import type { Server, Channel, Message, Member } from '../types';

interface AppState {
  // Servers
  servers: Server[];
  selectedServerId: string | null;
  setServers: (servers: Server[]) => void;
  addServer: (server: Server) => void;
  removeServer: (id: string) => void;
  selectServer: (id: string | null) => void;

  // Channels
  channels: Channel[];
  selectedChannelId: string | null;
  setChannels: (channels: Channel[]) => void;
  addChannel: (channel: Channel) => void;
  removeChannel: (id: string) => void;
  selectChannel: (id: string | null) => void;

  // Messages
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  deleteMessage: (messageId: string) => void;
  prependMessages: (messages: Message[]) => void;

  // Members
  members: Member[];
  setMembers: (members: Member[]) => void;

  // UI State
  showCreateServer: boolean;
  showJoinServer: boolean;
  setShowCreateServer: (show: boolean) => void;
  setShowJoinServer: (show: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Servers
  servers: [],
  selectedServerId: null,
  setServers: (servers) => set({ servers }),
  addServer: (server) => set((state) => ({ servers: [...state.servers, server] })),
  removeServer: (id) => set((state) => ({ 
    servers: state.servers.filter((s) => s.id !== id),
    selectedServerId: state.selectedServerId === id ? null : state.selectedServerId,
  })),
  selectServer: (id) => set({ selectedServerId: id, selectedChannelId: null, messages: [], channels: [], members: [] }),

  // Channels
  channels: [],
  selectedChannelId: null,
  setChannels: (channels) => set({ channels }),
  addChannel: (channel) => set((state) => ({ channels: [...state.channels, channel] })),
  removeChannel: (id) => set((state) => ({
    channels: state.channels.filter((c) => c.id !== id),
    selectedChannelId: state.selectedChannelId === id ? null : state.selectedChannelId,
  })),
  selectChannel: (id) => set({ selectedChannelId: id, messages: [] }),

  // Messages
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => {
    if (state.messages.some((m) => m.id === message.id)) return state;
    return { messages: [...state.messages, message] };
  }),
  updateMessage: (message) => set((state) => ({
    messages: state.messages.map((m) => (m.id === message.id ? message : m)),
  })),
  deleteMessage: (messageId) => set((state) => ({
    messages: state.messages.filter((m) => m.id !== messageId),
  })),
  prependMessages: (messages) => set((state) => ({ messages: [...messages, ...state.messages] })),

  // Members
  members: [],
  setMembers: (members) => set({ members }),

  // UI State
  showCreateServer: false,
  showJoinServer: false,
  setShowCreateServer: (show) => set({ showCreateServer: show }),
  setShowJoinServer: (show) => set({ showJoinServer: show }),
}));
