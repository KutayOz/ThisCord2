import { apiClient } from './client';
import type { Channel, CreateChannelRequest, Message, MessagePagedResult, SendMessageRequest, SendMessageWithAttachmentsRequest } from '../types';

export const channelsApi = {
  create: async (serverId: string, data: CreateChannelRequest): Promise<Channel> => {
    const response = await apiClient.post<Channel>(`/channels/servers/${serverId}`, data);
    return response.data;
  },

  getById: async (id: string): Promise<Channel> => {
    const response = await apiClient.get<Channel>(`/channels/${id}`);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateChannelRequest>): Promise<Channel> => {
    const response = await apiClient.put<Channel>(`/channels/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/channels/${id}`);
  },

  getMessages: async (id: string, before?: string, limit = 50): Promise<MessagePagedResult> => {
    const params = new URLSearchParams();
    if (before) params.append('before', before);
    params.append('limit', limit.toString());
    
    const response = await apiClient.get<MessagePagedResult>(`/channels/${id}/messages?${params}`);
    return response.data;
  },

  sendMessage: async (id: string, data: SendMessageRequest): Promise<Message> => {
    const response = await apiClient.post<Message>(`/channels/${id}/messages`, data);
    return response.data;
  },

  sendMessageWithAttachments: async (id: string, data: SendMessageWithAttachmentsRequest): Promise<Message> => {
    const response = await apiClient.post<Message>(`/channels/${id}/messages/with-attachments`, data);
    return response.data;
  },
};
