import apiClient from './client';
import { LoginCredentials, RegisterData, AuthTokens, User } from '@/types/auth';

export const authApi = {
  // Register new user
  register: async (data: RegisterData): Promise<User> => {
    const response = await apiClient.post<User>('/auth/register', data);
    return response.data;
  },

  // Login user
  login: async (credentials: LoginCredentials): Promise<AuthTokens> => {
    const response = await apiClient.post<AuthTokens>('/auth/login', credentials);
    return response.data;
  },

  // Get current user info
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  // Logout user
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens from localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  // Generate API key
  generateApiKey: async (): Promise<{ api_key: string; message: string }> => {
    const response = await apiClient.post('/auth/api-key');
    return response.data;
  },
};
