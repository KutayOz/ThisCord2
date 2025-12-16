import { apiClient } from './client';
import type { CreateFriendRequestRequest, FriendRequest, User } from '../types';

export const friendsApi = {
  getFriends: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/friends');
    return response.data;
  },

  getIncomingRequests: async (): Promise<FriendRequest[]> => {
    const response = await apiClient.get<FriendRequest[]>('/friends/requests/incoming');
    return response.data;
  },

  getOutgoingRequests: async (): Promise<FriendRequest[]> => {
    const response = await apiClient.get<FriendRequest[]>('/friends/requests/outgoing');
    return response.data;
  },

  sendRequest: async (usernameOrEmail: string): Promise<FriendRequest> => {
    const payload: CreateFriendRequestRequest = { usernameOrEmail };
    const response = await apiClient.post<FriendRequest>('/friends/requests', payload);
    return response.data;
  },

  accept: async (requestId: string): Promise<FriendRequest> => {
    const response = await apiClient.post<FriendRequest>(`/friends/requests/${requestId}/accept`);
    return response.data;
  },

  decline: async (requestId: string): Promise<FriendRequest> => {
    const response = await apiClient.post<FriendRequest>(`/friends/requests/${requestId}/decline`);
    return response.data;
  },

  cancel: async (requestId: string): Promise<void> => {
    await apiClient.post(`/friends/requests/${requestId}/cancel`);
  },

  removeFriend: async (friendUserId: string): Promise<void> => {
    await apiClient.delete(`/friends/${friendUserId}`);
  },
};
