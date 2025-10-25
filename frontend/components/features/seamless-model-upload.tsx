"use client";

import { useState } from 'react';
import { Upload, X, FileCode, CheckCircle2 } from 'lucide-react';
import { SmartVerificationBadge } from '@/components/ui/smart-verification-badge';
import { useAuthStore } from '@/store/authStore';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface UploadedModel {
  id: number;
  name: string;
  model_type: string;
  version: string;
  created_at: string;
}

/**
 * Seamless Model Upload with Auto-Verification
 * 
 * USER EXPERIENCE:
 * 1. Drag & drop model file
 * 2. Fill in basic info (name, type)
 * 3. Click "Upload"
 * 4. See progress bar
 * 5. Model appears with "Verifying..." badge
 * 6. Badge changes to "✓ Verified" automatically
 * 
 * WHAT HAPPENS BEHIND THE SCENES:
 * 1. File uploads to backend
 * 2. Model registered in database
 * 3. Hash calculated
 * 4. Proof generation starts automatically
 * 5. Proof gets verified
 * 6. Badge updates
 * 
 * USER SEES: Upload → ✓ Verified
 * USER DOESN'T SEE: All the complexity!
 */
export function SeamlessModelUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedModel, setUploadedModel] = useState<UploadedModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuthStore();

  // Form state
  const [modelName, setModelName] = useState('');
  const [modelType, setModelType] = useState<'onnx' | 'pytorch' | 'tensorflow'>('onnx');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-fill name from filename
      if (!modelName) {
        setModelName(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (!modelName) {
        setModelName(droppedFile.name.replace(/\.[^/.]+$/, ''));
      }
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !modelName || !accessToken) return;

    setUploading(true);
    setError(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload model - backend handles everything
      const response = await axios.post<UploadedModel>(
        `${API_BASE_URL}/api/v1/models/register`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'multipart/form-data',
          },
          params: {
            name: modelName,
            description: description || undefined,
            version: '1.0.0',
            model_type: modelType,
            is_public: isPublic,
          },
        }
      );

      setUploadedModel(response.data);
      
      // Success! Now auto-verification will start via SmartVerificationBadge
      // User sees upload complete → verifying badge appears → verified badge appears
      
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.detail || 'Failed to upload model');
    } finally {
      setUploading(false);
    }
  };

  const handleVerificationComplete = (isVerified: boolean) => {
    if (isVerified) {
      // Could show celebration animation or toast
      console.log('🎉 Model verified successfully!');
    }
  };

  // After successful upload and verification
  if (uploadedModel) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Model Uploaded Successfully! 🎉
          </h2>
          <p className="text-gray-600">
            Your model is being secured with cryptographic verification
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {uploadedModel.name}
              </h3>
              <p className="text-sm text-gray-600">
                {uploadedModel.model_type.toUpperCase()} • Version {uploadedModel.version}
              </p>
            </div>
            
            {/* This badge automatically starts verification! */}
            <SmartVerificationBadge 
              modelId={uploadedModel.id}
              autoVerify={true}
              onVerificationComplete={handleVerificationComplete}
            />
          </div>

          <div className="text-xs text-gray-500">
            Uploaded {new Date(uploadedModel.created_at).toLocaleString()}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setUploadedModel(null);
              setFile(null);
              setModelName('');
              setDescription('');
            }}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Upload Another Model
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Upload form
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Upload Your Model
      </h2>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-500'
        }`}
      >
        {file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCode className="w-8 h-8 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-600">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              Drag and drop your model file here
            </p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
              Browse Files
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".onnx,.pt,.pth,.pb,.h5"
              />
            </label>
          </>
        )}
      </div>

      {/* Model Details Form */}
      {file && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Name *
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="My Awesome Model"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Type *
            </label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="onnx">ONNX</option>
              <option value="pytorch">PyTorch</option>
              <option value="tensorflow">TensorFlow</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe your model..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="isPublic" className="text-sm text-gray-700">
              Make this model public
            </label>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Upload Button */}
      {file && (
        <button
          onClick={handleUpload}
          disabled={!modelName || uploading}
          className="w-full mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Uploading...
            </span>
          ) : (
            'Upload & Verify Model'
          )}
        </button>
      )}

      <p className="mt-4 text-xs text-gray-500 text-center">
        Your model will be automatically verified using cryptographic proofs after upload
      </p>
    </div>
  );
}
