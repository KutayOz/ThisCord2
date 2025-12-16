import { apiClient } from './client';
import type { AuthResponse, LoginRequest, RegisterRequest, UserDetail } from '../types';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getMe: async (): Promise<UserDetail> => {
    const response = await apiClient.get<UserDetail>('/auth/me');
    return response.data;
  },
};
