import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || '';

let communityHub: HubConnection | null = null;
let signalingHub: HubConnection | null = null;
let voiceHub: HubConnection | null = null;

async function ensureStarted(connection: HubConnection): Promise<HubConnection> {
  if (connection.state === HubConnectionState.Disconnected) {
    await connection.start();
  }
  return connection;
}

function createHub(path: string): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${API_URL}${path}`, {
      accessTokenFactory: () => useAuthStore.getState().accessToken || '',
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Information)
    .build();
}

export async function getCommunityHub(): Promise<HubConnection> {
  if (!communityHub) {
    communityHub = createHub('/hubs/community');
  }

  return ensureStarted(communityHub);
}

export async function getSignalingHub(): Promise<HubConnection> {
  if (!signalingHub) {
    signalingHub = createHub('/hubs/signaling');
  }

  return ensureStarted(signalingHub);
}

export async function getVoiceHub(): Promise<HubConnection> {
  if (!voiceHub) {
    voiceHub = createHub('/hubs/voice');
  }

  return ensureStarted(voiceHub);
}
