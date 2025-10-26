/**
 * Mock Data Service
 * Provides realistic mock data for demo purposes when backend is unavailable
 */

export interface MockModel {
  id: number;
  name: string;
  description: string;
  model_type: 'onnx' | 'pytorch' | 'tensorflow';
  version: string;
  model_hash: string;
  file_path: string;
  owner_id: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface MockProofJob {
  id: number;
  model_id: number;
  model_name?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  input_data: any;
  proof_path?: string;
  witness_path?: string;
  settings_path?: string;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  celery_task_id?: string;
}

// Sample models
export const mockModels: MockModel[] = [
  {
    id: 1,
    name: 'ResNet50 Image Classifier',
    description: 'Deep residual network for image classification trained on ImageNet',
    model_type: 'onnx',
    version: '1.0.0',
    model_hash: 'a7f9e2c3d4b5a6f7e8d9c0b1a2f3e4d5',
    file_path: '/models/resnet50.onnx',
    owner_id: 1,
    is_public: true,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    name: 'GPT-2 Text Generator',
    description: 'Transformer-based language model for text generation',
    model_type: 'pytorch',
    version: '2.1.0',
    model_hash: 'b8g0f3d4e5c6b7g8f9e0d1c2b3g4f5e6',
    file_path: '/models/gpt2.pt',
    owner_id: 1,
    is_public: false,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    name: 'BERT Sentiment Analyzer',
    description: 'Fine-tuned BERT model for sentiment analysis on product reviews',
    model_type: 'tensorflow',
    version: '1.5.0',
    model_hash: 'c9h1g4e5f6d7c8h9g0f1e2d3c4h5g6f7',
    file_path: '/models/bert-sentiment.pb',
    owner_id: 1,
    is_public: true,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    name: 'YOLOv8 Object Detector',
    description: 'Real-time object detection model optimized for edge devices',
    model_type: 'onnx',
    version: '8.0.0',
    model_hash: 'd0i2h5f6g7e8d9i0h1g2f3e4d5i6h7g8',
    file_path: '/models/yolov8.onnx',
    owner_id: 1,
    is_public: false,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 5,
    name: 'MobileNetV3 Edge AI',
    description: 'Lightweight model optimized for mobile and embedded devices',
    model_type: 'pytorch',
    version: '3.0.1',
    model_hash: 'e1j3i6g7h8f9e0j1i2h3g4f5e6j7i8h9',
    file_path: '/models/mobilenetv3.pth',
    owner_id: 1,
    is_public: true,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Sample proof jobs
export const mockProofJobs: MockProofJob[] = [
  {
    id: 1,
    model_id: 1,
    model_name: 'ResNet50 Image Classifier',
    status: 'COMPLETED',
    input_data: { image: 'cat.jpg', dimensions: [224, 224, 3] },
    proof_path: '/proofs/proof_1.json',
    witness_path: '/proofs/witness_1.json',
    settings_path: '/proofs/settings_1.json',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    started_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    celery_task_id: 'task_abc123',
  },
  {
    id: 2,
    model_id: 2,
    model_name: 'GPT-2 Text Generator',
    status: 'PROCESSING',
    input_data: { prompt: 'The future of AI is', max_length: 100 },
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    celery_task_id: 'task_def456',
  },
  {
    id: 3,
    model_id: 3,
    model_name: 'BERT Sentiment Analyzer',
    status: 'COMPLETED',
    input_data: { text: 'This product is amazing!' },
    proof_path: '/proofs/proof_3.json',
    witness_path: '/proofs/witness_3.json',
    settings_path: '/proofs/settings_3.json',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    celery_task_id: 'task_ghi789',
  },
  {
    id: 4,
    model_id: 4,
    model_name: 'YOLOv8 Object Detector',
    status: 'FAILED',
    input_data: { image: 'scene.jpg', confidence_threshold: 0.5 },
    error_message: 'Input validation failed: Image dimensions incompatible with model',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    celery_task_id: 'task_jkl012',
  },
  {
    id: 5,
    model_id: 5,
    model_name: 'MobileNetV3 Edge AI',
    status: 'PENDING',
    input_data: { image: 'test_input.png' },
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    celery_task_id: 'task_mno345',
  },
];

class MockDataService {
  private models: MockModel[] = [...mockModels];
  private proofJobs: MockProofJob[] = [...mockProofJobs];
  private nextModelId = 6;
  private nextProofJobId = 6;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Auto-progress mock proof jobs
    this.startAutoProgress();
  }

  // Start auto-progressing proof jobs
  private startAutoProgress() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(() => {
      this.proofJobs = this.proofJobs.map(job => {
        // Progress PENDING -> PROCESSING
        if (job.status === 'PENDING') {
          const timeSincePending = Date.now() - new Date(job.created_at).getTime();
          if (timeSincePending > 5000) { // 5 seconds
            return {
              ...job,
              status: 'PROCESSING' as const,
              started_at: new Date().toISOString(),
            };
          }
        }

        // Progress PROCESSING -> COMPLETED (80% chance) or FAILED (20% chance)
        if (job.status === 'PROCESSING' && job.started_at) {
          const timeProcessing = Date.now() - new Date(job.started_at).getTime();
          if (timeProcessing > 30000) { // 30 seconds
            const success = Math.random() > 0.2; // 80% success rate
            return {
              ...job,
              status: success ? 'COMPLETED' as const : 'FAILED' as const,
              completed_at: new Date().toISOString(),
              proof_path: success ? `/proofs/proof_${job.id}.json` : undefined,
              witness_path: success ? `/proofs/witness_${job.id}.json` : undefined,
              settings_path: success ? `/proofs/settings_${job.id}.json` : undefined,
              error_message: !success ? 'Mock error: Random failure for demonstration' : undefined,
            };
          }
        }

        return job;
      });
    }, 2000); // Check every 2 seconds
  }

  // Get all models
  getModels(): MockModel[] {
    return [...this.models];
  }

  // Get model by ID
  getModel(id: number): MockModel | undefined {
    return this.models.find(m => m.id === id);
  }

  // Upload/Register a new model
  registerModel(data: {
    name: string;
    description: string;
    model_type: 'onnx' | 'pytorch' | 'tensorflow';
    version: string;
    file: File;
  }): MockModel {
    const newModel: MockModel = {
      id: this.nextModelId++,
      name: data.name,
      description: data.description,
      model_type: data.model_type,
      version: data.version,
      model_hash: this.generateHash(),
      file_path: `/models/${data.file.name}`,
      owner_id: 1,
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.models.push(newModel);
    return newModel;
  }

  // Delete a model
  deleteModel(id: number): boolean {
    const index = this.models.findIndex(m => m.id === id);
    if (index !== -1) {
      this.models.splice(index, 1);
      // Also delete associated proof jobs
      this.proofJobs = this.proofJobs.filter(j => j.model_id !== id);
      return true;
    }
    return false;
  }

  // Get all proof jobs
  getProofJobs(): MockProofJob[] {
    return [...this.proofJobs];
  }

  // Get proof job by ID
  getProofJob(id: number): MockProofJob | undefined {
    return this.proofJobs.find(j => j.id === id);
  }

  // Generate a new proof job
  generateProof(modelId: number, inputData: any): MockProofJob {
    const model = this.getModel(modelId);
    const newJob: MockProofJob = {
      id: this.nextProofJobId++,
      model_id: modelId,
      model_name: model?.name || `Model #${modelId}`,
      status: 'PENDING',
      input_data: inputData,
      created_at: new Date().toISOString(),
      celery_task_id: `task_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.proofJobs.push(newJob);
    return newJob;
  }

  // Retry a failed proof job
  retryProof(jobId: number): MockProofJob | null {
    const job = this.proofJobs.find(j => j.id === jobId);
    if (!job || job.status !== 'FAILED') {
      return null;
    }

    // Create a new job with same data
    return this.generateProof(job.model_id, job.input_data);
  }

  // Helper: Generate random hash
  private generateHash(): string {
    return Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  // Cleanup
  destroy() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

// Singleton instance
export const mockDataService = new MockDataService();

// Simulate API delay
export const simulateDelay = (ms: number = 500) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
