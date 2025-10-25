"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { 
  generateProof, 
  getProofJobStatus, 
  verifyProof,
  checkModelVerification 
} from '@/lib/api/verification';

interface VerificationState {
  isVerified: boolean;
  isVerifying: boolean;
  progress: 'idle' | 'generating' | 'verifying' | 'completed' | 'error';
  error?: string;
}

/**
 * Auto-verification hook - Handles entire verification flow automatically
 * 
 * This hook silently verifies models in the background:
 * 1. Checks if model is already verified
 * 2. If not, generates proof automatically
 * 3. Polls for completion
 * 4. Verifies the proof
 * 5. Updates state when done
 * 
 * User sees: Upload → [automatic magic] → ✓ Verified
 */
export function useAutoVerification(modelId: number | null, autoStart = true) {
  const [state, setState] = useState<VerificationState>({
    isVerified: false,
    isVerifying: false,
    progress: 'idle'
  });
  
  const { accessToken } = useAuthStore();

  // Check if model is already verified
  const checkVerification = useCallback(async () => {
    if (!modelId || !accessToken) return;

    try {
      const result = await checkModelVerification(modelId, accessToken);
      
      if (result.isVerified) {
        setState({
          isVerified: true,
          isVerifying: false,
          progress: 'completed'
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking verification:', error);
      return false;
    }
  }, [modelId, accessToken]);

  // Start automatic verification flow
  const startVerification = useCallback(async () => {
    if (!modelId || !accessToken) return;

    setState(prev => ({ ...prev, isVerifying: true, progress: 'generating' }));

    try {
      // Step 1: Generate proof with sample input
      const proofJob = await generateProof(
        modelId,
        { sample: true }, // Generic sample input
        accessToken
      );

      // Step 2: Poll for completion (every 3 seconds)
      const pollInterval = setInterval(async () => {
        try {
          const status = await getProofJobStatus(proofJob.id, accessToken);

          if (status.status === 'COMPLETED') {
            clearInterval(pollInterval);
            setState(prev => ({ ...prev, progress: 'verifying' }));

            // Step 3: Verify the proof
            const verification = await verifyProof(proofJob.id, accessToken);

            setState({
              isVerified: verification.is_valid,
              isVerifying: false,
              progress: verification.is_valid ? 'completed' : 'error',
              error: verification.is_valid ? undefined : 'Verification failed'
            });
          } else if (status.status === 'FAILED') {
            clearInterval(pollInterval);
            setState({
              isVerified: false,
              isVerifying: false,
              progress: 'error',
              error: status.error_message || 'Proof generation failed'
            });
          }
        } catch (error) {
          clearInterval(pollInterval);
          setState({
            isVerified: false,
            isVerifying: false,
            progress: 'error',
            error: 'Failed to check proof status'
          });
        }
      }, 3000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (state.progress === 'generating') {
          setState({
            isVerified: false,
            isVerifying: false,
            progress: 'error',
            error: 'Verification timeout'
          });
        }
      }, 300000);

    } catch (error: any) {
      setState({
        isVerified: false,
        isVerifying: false,
        progress: 'error',
        error: error.response?.data?.detail || 'Failed to start verification'
      });
    }
  }, [modelId, accessToken, state.progress]);

  // Auto-start verification on mount if enabled
  useEffect(() => {
    if (!autoStart || !modelId) return;

    const initVerification = async () => {
      const alreadyVerified = await checkVerification();
      if (!alreadyVerified) {
        // Wait a bit after model upload before starting verification
        setTimeout(() => startVerification(), 2000);
      }
    };

    initVerification();
  }, [modelId, autoStart, checkVerification, startVerification]);

  return {
    ...state,
    retry: startVerification,
    checkNow: checkVerification
  };
}

/**
 * Simplified hook for just checking verification status
 * No automatic verification - just checks if already verified
 */
export function useVerificationStatus(modelId: number | null) {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    const check = async () => {
      if (!modelId || !accessToken) {
        setLoading(false);
        return;
      }

      try {
        const result = await checkModelVerification(modelId, accessToken);
        setIsVerified(result.isVerified);
      } catch (error) {
        console.error('Error checking verification:', error);
        setIsVerified(false);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [modelId, accessToken]);

  return { isVerified, loading };
}
