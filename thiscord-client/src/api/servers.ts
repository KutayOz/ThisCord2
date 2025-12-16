import { apiClient } from './client';
import type { Server, ServerDetail, CreateServerRequest, Channel, Member } from '../types';

export const serversApi = {
  getMyServers: async (): Promise<Server[]> => {
    const response = await apiClient.get<Server[]>('/servers');
    return response.data;
  },

  getById: async (id: string): Promise<ServerDetail> => {
    const response = await apiClient.get<ServerDetail>(`/servers/${id}`);
    return response.data;
  },

  create: async (data: CreateServerRequest): Promise<Server> => {
    const response = await apiClient.post<Server>('/servers', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateServerRequest>): Promise<Server> => {
    const response = await apiClient.put<Server>(`/servers/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/servers/${id}`);
  },

  join: async (inviteCode: string): Promise<Server> => {
    const response = await apiClient.post<Server>(`/servers/join/${inviteCode}`);
    return response.data;
  },

  leave: async (id: string): Promise<void> => {
    await apiClient.delete(`/servers/${id}/leave`);
  },

  getChannels: async (id: string): Promise<Channel[]> => {
    const response = await apiClient.get<Channel[]>(`/servers/${id}/channels`);
    return response.data;
  },

  getMembers: async (id: string): Promise<Member[]> => {
    const response = await apiClient.get<Member[]>(`/servers/${id}/members`);
    return response.data;
  },
};
