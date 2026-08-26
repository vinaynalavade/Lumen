import { ApiClient } from './api';
import type { AuthResponse, User } from '../types';

export const authApi = {
  login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await ApiClient.post<AuthResponse>('/auth/login', credentials);
    ApiClient.setToken(response.access_token);
    return response;
  },

  register: async (userData: { email: string; password: string; full_name: string }): Promise<User> => {
    return ApiClient.post<User>('/auth/register', userData);
  },

  getCurrentUser: async (): Promise<User> => {
    return ApiClient.get<User>('/auth/me');
  },

  logout: () => {
    ApiClient.removeToken();
  },
};
