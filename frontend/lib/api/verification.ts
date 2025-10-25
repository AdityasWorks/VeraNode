/**
 * Verification API Client
 * Handles model verification checks and proof generation
 */

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ProofJobStatus {
  id: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: string;
  error_message?: string;
  proof_available: boolean;
}

export interface VerificationResult {
  id: number;
  proof_job_id: number;
  model_id: number;
  is_valid: boolean;
  verification_time_ms?: number;
  verified_at: string;
}

export interface ProofJobResponse {
  id: number;
  model_id: number;
  user_id: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  celery_task_id?: string;
  input_data_hash: string;
  proof_path?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

/**
 * Check if a model is verified by looking for valid verification records
 */
export async function checkModelVerification(modelId: number, accessToken: string): Promise<{
  isVerified: boolean;
  verifications: VerificationResult[];
  latestVerification?: VerificationResult;
}> {
  try {
    // Get all proof jobs for the current user
    const response = await axios.get<ProofJobResponse[]>(
      `${API_BASE_URL}/api/v1/verification/my-proofs`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { skip: 0, limit: 100 }
      }
    );

    // Filter completed proof jobs for this model
    const completedProofs = response.data.filter(
      (job) => job.model_id === modelId && job.status === 'COMPLETED'
    );

    if (completedProofs.length === 0) {
      return { isVerified: false, verifications: [] };
    }

    // Check verification status for each completed proof
    const verificationPromises = completedProofs.map(async (proof) => {
      try {
        const verifyResponse = await axios.post<VerificationResult>(
          `${API_BASE_URL}/api/v1/verification/verify`,
          { proof_job_id: proof.id },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        return verifyResponse.data;
      } catch (error) {
        console.error(`Failed to verify proof ${proof.id}:`, error);
        return null;
      }
    });

    const verifications = (await Promise.all(verificationPromises)).filter(
      (v): v is VerificationResult => v !== null
    );

    // Check if any verification is valid
    const isVerified = verifications.some((v) => v.is_valid);
    const latestVerification = verifications
      .sort((a, b) => new Date(b.verified_at).getTime() - new Date(a.verified_at).getTime())[0];

    return { isVerified, verifications, latestVerification };
  } catch (error) {
    console.error('Error checking model verification:', error);
    return { isVerified: false, verifications: [] };
  }
}

/**
 * Get proof job status
 */
export async function getProofJobStatus(
  proofJobId: number,
  accessToken: string
): Promise<ProofJobStatus> {
  const response = await axios.get<ProofJobStatus>(
    `${API_BASE_URL}/api/v1/verification/status/${proofJobId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
}

/**
 * Generate a new proof for a model
 */
export async function generateProof(
  modelId: number,
  inputData: Record<string, any>,
  accessToken: string
): Promise<ProofJobResponse> {
  const response = await axios.post<ProofJobResponse>(
    `${API_BASE_URL}/api/v1/verification/generate-proof`,
    {
      model_id: modelId,
      input_data: inputData,
    },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
}

/**
 * Verify a completed proof
 */
export async function verifyProof(
  proofJobId: number,
  accessToken: string
): Promise<VerificationResult> {
  const response = await axios.post<VerificationResult>(
    `${API_BASE_URL}/api/v1/verification/verify`,
    { proof_job_id: proofJobId },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
}

/**
 * Get all proof jobs for the current user
 */
export async function getMyProofs(
  accessToken: string,
  skip = 0,
  limit = 20
): Promise<ProofJobResponse[]> {
  const response = await axios.get<ProofJobResponse[]>(
    `${API_BASE_URL}/api/v1/verification/my-proofs`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { skip, limit }
    }
  );
  return response.data;
}
