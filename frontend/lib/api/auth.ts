import apiClient from './client';
import { LoginCredentials, RegisterData, AuthTokens, User } from '@/types/auth';
import { MockAuthService } from '@/lib/mockAuth';

const USE_MOCK_FALLBACK = true;

async function withMockFallback<T>(
  backendCall: () => Promise<T>,
  mockCall: () => Promise<T>
): Promise<T> {
  if (!USE_MOCK_FALLBACK) {
    return backendCall();
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const result = await Promise.race([
      backendCall(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 3000)
      ),
    ]);

    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    console.warn('Backend unavailable, using mock auth', error);
    return mockCall();
  }
}

export const authApi = {
  // Register new user
  register: async (data: RegisterData): Promise<User> => {
    return withMockFallback(
      async () => {
        const response = await apiClient.post<User>('/auth/register', data);
        return response.data;
      },
      async () => {
        await MockAuthService.register(data);
        return MockAuthService.getCurrentUser();
      }
    );
  },

  // Login user
  login: async (credentials: LoginCredentials): Promise<AuthTokens> => {
    return withMockFallback(
      async () => {
        const response = await apiClient.post<AuthTokens>('/auth/login', credentials);
        return response.data;
      },
      async () => {
        return MockAuthService.login(credentials);
      }
    );
  },

  // Get current user info
  getCurrentUser: async (): Promise<User> => {
    return withMockFallback(
      async () => {
        const response = await apiClient.get<User>('/auth/me');
        return response.data;
      },
      async () => {
        return MockAuthService.getCurrentUser();
      }
    );
  },

  // Logout user
  logout: async (): Promise<void> => {
    try {
      await withMockFallback(
        async () => {
          await apiClient.post('/auth/logout');
        },
        async () => {
          await MockAuthService.logout();
        }
      );
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
    return withMockFallback(
      async () => {
        const response = await apiClient.post('/auth/api-key');
        return response.data;
      },
      async () => {
        // Mock API key generation
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          api_key: `mock_api_key_${Math.random().toString(36).substr(2, 9)}`,
          message: 'Mock API key generated successfully (demo mode)',
        };
      }
    );
  },
};
