import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, User, LoginCredentials, RegisterData } from '@/types/auth';
import { authApi } from '@/lib/api/auth';
import { jwtDecode } from 'jwt-decode';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  checkAuth: () => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true });
        try {
          // Call login API
          const tokens = await authApi.login(credentials);
          
          // Store tokens in localStorage
          localStorage.setItem('accessToken', tokens.access_token);
          localStorage.setItem('refreshToken', tokens.refresh_token);
          
          // Also set in cookies for middleware
          document.cookie = `accessToken=${tokens.access_token}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `refreshToken=${tokens.refresh_token}; path=/; max-age=604800; SameSite=Lax`;
          
          // Fetch user info
          const user = await authApi.getCurrentUser();
          
          // Update store
          set({
            user,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true });
        try {
          // Call register API
          await authApi.register(data);
          
          // Auto-login after registration
          await get().login({
            email: data.email,
            password: data.password,
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          get().clearAuth();
        }
      },

      setUser: (user: User) => {
        set({ user });
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        // Also set in cookies for middleware
        document.cookie = `accessToken=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `refreshToken=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;
        
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      checkAuth: async () => {
        const accessToken = localStorage.getItem('accessToken');
        
        if (!accessToken) {
          get().clearAuth();
          return;
        }

        try {
          // Decode JWT to check expiration
          const decoded: any = jwtDecode(accessToken);
          const currentTime = Date.now() / 1000;

          if (decoded.exp < currentTime) {
            // Token expired, try to refresh
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
              get().clearAuth();
              return;
            }
            // Token refresh will be handled by axios interceptor
          }

          // Fetch current user
          const user = await authApi.getCurrentUser();
          set({
            user,
            accessToken,
            refreshToken: localStorage.getItem('refreshToken'),
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('Auth check failed:', error);
          get().clearAuth();
        }
      },

      clearAuth: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // Clear cookies
        document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
