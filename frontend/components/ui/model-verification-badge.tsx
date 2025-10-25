"use client";

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { checkModelVerification } from '@/lib/api/verification';
import { useAuthStore } from '@/store/authStore';

interface ModelVerificationBadgeProps {
  modelId: number;
  showDetails?: boolean;
  className?: string;
}

/**
 * Badge component to display model verification status
 * Shows: Verified ✓, Not Verified ✗, or Loading spinner
 */
export function ModelVerificationBadge({ 
  modelId, 
  showDetails = false,
  className = '' 
}: ModelVerificationBadgeProps) {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationDate, setVerificationDate] = useState<string | null>(null);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    const checkVerification = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await checkModelVerification(modelId, accessToken);
        setIsVerified(result.isVerified);
        
        if (result.latestVerification) {
          setVerificationDate(result.latestVerification.verified_at);
        }
      } catch (err) {
        console.error('Error checking verification:', err);
        setError('Failed to check verification status');
        setIsVerified(false);
      } finally {
        setLoading(false);
      }
    };

    checkVerification();
  }, [modelId, accessToken]);

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Checking...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span>Verification Error</span>
      </div>
    );
  }

  if (isVerified === null) {
    return null;
  }

  if (isVerified) {
    return (
      <div className={`inline-flex flex-col ${className}`}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" />
          <span>Verified</span>
        </div>
        {showDetails && verificationDate && (
          <span className="text-xs text-gray-500 mt-1 ml-1">
            Verified on {new Date(verificationDate).toLocaleDateString()}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm ${className}`}>
      <XCircle className="w-4 h-4" />
      <span>Not Verified</span>
    </div>
  );
}

/**
 * Detailed verification status component with more information
 */
export function ModelVerificationStatus({ modelId }: { modelId: number }) {
  const [status, setStatus] = useState<{
    isVerified: boolean;
    verifications: any[];
    latestVerification?: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    const fetchStatus = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const result = await checkModelVerification(modelId, accessToken);
        setStatus(result);
      } catch (err) {
        console.error('Error fetching verification status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [modelId, accessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">Unable to load verification status</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg border-2 ${
        status.isVerified 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-3 mb-2">
          {status.isVerified ? (
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          ) : (
            <XCircle className="w-6 h-6 text-red-600" />
          )}
          <h3 className={`text-lg font-semibold ${
            status.isVerified ? 'text-green-900' : 'text-red-900'
          }`}>
            {status.isVerified ? 'Model Verified' : 'Model Not Verified'}
          </h3>
        </div>
        
        {status.latestVerification && (
          <div className="text-sm space-y-1 ml-9">
            <p className="text-gray-700">
              <span className="font-medium">Verification Time:</span>{' '}
              {status.latestVerification.verification_time_ms}ms
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Verified At:</span>{' '}
              {new Date(status.latestVerification.verified_at).toLocaleString()}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Verification ID:</span>{' '}
              {status.latestVerification.id}
            </p>
          </div>
        )}
      </div>

      {status.verifications.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">
            Verification History ({status.verifications.length})
          </h4>
          <div className="space-y-2">
            {status.verifications.map((verification) => (
              <div 
                key={verification.id}
                className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  {verification.is_valid ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm text-gray-700">
                    {new Date(verification.verified_at).toLocaleDateString()}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {verification.verification_time_ms}ms
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!status.isVerified && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> This model hasn't been verified yet. Generate a proof and verify it to establish authenticity.
          </p>
        </div>
      )}
    </div>
  );
}
