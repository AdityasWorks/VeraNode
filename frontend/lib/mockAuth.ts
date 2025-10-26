/**
 * Mock Authentication Service
 * Provides simulated authentication for demo mode
 */

import { User, LoginCredentials, RegisterData, UserRole } from '@/types/auth';

// Mock user database
const mockUsers: Map<string, { password: string; user: User }> = new Map([
  [
    'demo@veranode.com',
    {
      password: 'demo123',
      user: {
        id: 1,
        username: 'demo_user',
        email: 'demo@veranode.com',
        role: UserRole.USER,
        is_active: true,
        is_verified: true,
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  ],
  [
    'admin@veranode.com',
    {
      password: 'admin123',
      user: {
        id: 2,
        username: 'admin',
        email: 'admin@veranode.com',
        role: UserRole.ADMIN,
        is_active: true,
        is_verified: true,
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  ],
]);

// Generate a simple mock JWT token
function generateMockToken(user: User): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: user.id.toString(),
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    })
  );
  const signature = 'mock_signature';
  return `${header}.${payload}.${signature}`;
}

export class MockAuthService {
  private static currentUser: User | null = null;
  private static accessToken: string | null = null;

  static async login(credentials: LoginCredentials): Promise<{ access_token: string; refresh_token: string }> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    const userData = mockUsers.get(credentials.email);
    
    if (!userData || userData.password !== credentials.password) {
      throw new Error('Invalid email or password');
    }

    this.currentUser = userData.user;
    this.accessToken = generateMockToken(userData.user);

    return {
      access_token: this.accessToken,
      refresh_token: generateMockToken(userData.user),
    };
  }

  static async register(data: RegisterData): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    // Check if user already exists
    if (mockUsers.has(data.email)) {
      throw new Error('User with this email already exists');
    }

    // Create new user
    const newUser: User = {
      id: mockUsers.size + 1,
      username: data.username,
      email: data.email,
      role: data.role || UserRole.USER,
      is_active: true,
      is_verified: false,
      created_at: new Date().toISOString(),
    };

    mockUsers.set(data.email, {
      password: data.password,
      user: newUser,
    });

    this.currentUser = newUser;
    this.accessToken = generateMockToken(newUser);
  }

  static async getCurrentUser(): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay

    if (!this.currentUser) {
      throw new Error('Not authenticated');
    }

    return this.currentUser;
  }

  static async logout(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
    this.currentUser = null;
    this.accessToken = null;
  }

  static isAuthenticated(): boolean {
    return this.currentUser !== null && this.accessToken !== null;
  }

  static getAccessToken(): string | null {
    return this.accessToken;
  }

  static setCurrentUserFromToken(token: string): User | null {
    try {
      // Decode the mock token
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      
      // Find user by email from payload
      for (const [email, userData] of mockUsers.entries()) {
        if (userData.user.email === payload.email) {
          this.currentUser = userData.user;
          this.accessToken = token;
          return userData.user;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}

// Export mock credentials for demo
export const MOCK_CREDENTIALS = {
  demo: {
    email: 'demo@veranode.com',
    password: 'demo123',
  },
  admin: {
    email: 'admin@veranode.com',
    password: 'admin123',
  },
};
