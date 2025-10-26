/**
 * API Service with automatic fallback to mock data
 * Tries backend first, falls back to mock data if backend is unavailable
 */

import { mockDataService, simulateDelay, type MockModel, type MockProofJob } from './mockData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const USE_MOCK_FALLBACK = true; // Set to false to disable mock fallback

interface ApiConfig {
  accessToken?: string;
}

class ApiService {
  private config: ApiConfig = {};
  private backendAvailable: boolean | null = null;
  private lastHealthCheck: number = 0;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  setAccessToken(token: string | null) {
    if (token) {
      this.config.accessToken = token;
    } else {
      delete this.config.accessToken;
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.config.accessToken) {
      headers['Authorization'] = `Bearer ${this.config.accessToken}`;
    }

    return headers;
  }

  // Check if backend is available
  private async checkBackendHealth(): Promise<boolean> {
    const now = Date.now();
    
    // Use cached result if recent
    if (this.backendAvailable !== null && (now - this.lastHealthCheck) < this.HEALTH_CHECK_INTERVAL) {
      return this.backendAvailable;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(`${API_BASE_URL}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      this.backendAvailable = response.ok;
      this.lastHealthCheck = now;
      
      return response.ok;
    } catch (error) {
      this.backendAvailable = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  // Generic fetch with fallback
  private async fetchWithFallback<T>(
    endpoint: string,
    options: RequestInit = {},
    mockFallback: () => Promise<T>
  ): Promise<T> {
    if (!USE_MOCK_FALLBACK) {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: { ...this.getHeaders(), ...options.headers },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return response.json();
    }

    // Try backend first
    try {
      const isHealthy = await this.checkBackendHealth();
      
      if (isHealthy) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: { ...this.getHeaders(), ...options.headers },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return response.json();
        }
      }
    } catch (error) {
      console.warn(`Backend unavailable for ${endpoint}, using mock data`, error);
    }

    // Fallback to mock data
    console.log(`Using mock data for ${endpoint}`);
    await simulateDelay(300); // Simulate network delay
    return mockFallback();
  }

  // Models API
  async getMyModels(): Promise<{ models: MockModel[] }> {
    return this.fetchWithFallback(
      '/api/v1/models/my-models',
      {},
      async () => ({ models: mockDataService.getModels() })
    );
  }

  async registerModel(data: {
    name: string;
    description: string;
    model_type: 'onnx' | 'pytorch' | 'tensorflow';
    version: string;
    file: File;
  }): Promise<MockModel> {
    return this.fetchWithFallback(
      `/api/v1/models/register?name=${encodeURIComponent(data.name)}&model_type=${data.model_type}&version=${data.version}&description=${encodeURIComponent(data.description)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
        body: (() => {
          const formData = new FormData();
          formData.append('file', data.file);
          return formData;
        })(),
      },
      async () => mockDataService.registerModel(data)
    );
  }

  async deleteModel(modelId: number): Promise<void> {
    return this.fetchWithFallback(
      `/api/v1/models/${modelId}`,
      {
        method: 'DELETE',
      },
      async () => {
        mockDataService.deleteModel(modelId);
      }
    );
  }

  // Proof Jobs API
  async getMyProofs(): Promise<MockProofJob[]> {
    return this.fetchWithFallback(
      '/api/v1/verification/my-proofs',
      {},
      async () => mockDataService.getProofJobs()
    );
  }

  async generateProof(modelId: number, inputData: any): Promise<MockProofJob> {
    return this.fetchWithFallback(
      '/api/v1/verification/generate-proof',
      {
        method: 'POST',
        body: JSON.stringify({
          model_id: modelId,
          input_data: inputData,
        }),
      },
      async () => mockDataService.generateProof(modelId, inputData)
    );
  }

  async retryProof(jobId: number): Promise<MockProofJob | null> {
    return this.fetchWithFallback(
      `/api/v1/verification/retry-proof/${jobId}`,
      {
        method: 'POST',
      },
      async () => mockDataService.retryProof(jobId)
    );
  }

  // Get backend status
  async getBackendStatus(): Promise<{ available: boolean; mode: 'backend' | 'mock' }> {
    const available = await this.checkBackendHealth();
    return {
      available,
      mode: available ? 'backend' : 'mock',
    };
  }
}

export const apiService = new ApiService();
