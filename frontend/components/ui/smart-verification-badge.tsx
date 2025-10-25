"use client";

import { useEffect } from 'react';
import { CheckCircle2, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useAutoVerification } from '@/hooks/useAutoVerification';

interface SmartVerificationBadgeProps {
  modelId: number;
  autoVerify?: boolean;
  onVerificationComplete?: (isVerified: boolean) => void;
}

/**
 * Smart Verification Badge - The user-facing component
 * 
 * This handles ALL verification complexity behind the scenes:
 * - Automatically checks if model is verified
 * - If not, starts verification in background
 * - Shows elegant progress states
 * - Notifies when complete
 * 
 * USER SEES:
 * 1. Shimmer animation → "Verifying..." (30s - 2min)
 * 2. ✓ Verified! (green badge)
 * 
 * NEVER SEES:
 * - Proof generation
 * - Job IDs
 * - Technical errors (just "Try again" button)
 * - Polling logic
 */
export function SmartVerificationBadge({ 
  modelId, 
  autoVerify = true,
  onVerificationComplete 
}: SmartVerificationBadgeProps) {
  const { isVerified, isVerifying, progress, error, retry } = useAutoVerification(
    modelId, 
    autoVerify
  );

  // Notify parent when verification completes
  useEffect(() => {
    if (progress === 'completed' && onVerificationComplete) {
      onVerificationComplete(isVerified);
    }
  }, [progress, isVerified, onVerificationComplete]);

  // ✓ Already verified - show success immediately
  if (isVerified && progress === 'completed') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium shadow-sm">
        <CheckCircle2 className="w-4 h-4" />
        <span>Verified</span>
      </div>
    );
  }

  // 🔄 Generating proof - elegant loading state
  if (progress === 'generating') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium shadow-sm animate-pulse">
        <Sparkles className="w-4 h-4 animate-spin" />
        <span>Securing model...</span>
      </div>
    );
  }

  // ✨ Verifying proof - almost done
  if (progress === 'verifying') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 text-sm font-medium shadow-sm animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Finalizing...</span>
      </div>
    );
  }

  // ❌ Error - show friendly message with retry
  if (progress === 'error') {
    return (
      <div className="inline-flex items-center gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-medium shadow-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Verification pending</span>
        </div>
        <button
          onClick={retry}
          className="text-xs text-blue-600 hover:text-blue-700 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // ⏳ Initial state - starting verification
  if (isVerifying) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-sm font-medium shadow-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Verifying...</span>
      </div>
    );
  }

  // 🆕 Not started yet
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-sm">
      <div className="w-2 h-2 rounded-full bg-gray-400" />
      <span>Pending</span>
    </div>
  );
}

/**
 * Inline Verification Progress - Shows inside cards/panels
 * Even more subtle - just a small indicator
 */
export function InlineVerificationStatus({ modelId }: { modelId: number }) {
  const { isVerified, isVerifying, progress } = useAutoVerification(modelId, true);

  if (isVerified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="w-3 h-3" />
        Verified
      </span>
    );
  }

  if (isVerifying || progress === 'generating' || progress === 'verifying') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-600">
        <Loader2 className="w-3 h-3 animate-spin" />
        Verifying
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
      <div className="w-2 h-2 rounded-full bg-gray-300" />
      Pending
    </span>
  );
}

/**
 * Verification Toast Notification - Appears when complete
 * Shows celebratory message when verification succeeds
 */
export function VerificationToast({ 
  modelName, 
  onClose 
}: { 
  modelName: string; 
  onClose: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-green-200 p-4 max-w-md">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            Model Verified! 🎉
          </h4>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{modelName}</span> has been cryptographically verified and is ready to use.
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
    </div>
  );
}
