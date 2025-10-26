"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/ui/toast-provider";
import { AuthUI } from "@/components/ui/auth-fuse";
import { UserRole } from "@/types/auth";
import { MOCK_CREDENTIALS } from "@/lib/mockAuth";
import { Info } from "lucide-react";

interface ApiErrorDetail {
  msg?: string;
  message?: string;
}

interface ApiError {
  response?: {
    data?: {
      detail?: string | ApiErrorDetail[];
      message?: string;
    } | string;
  };
  message?: string;
}

export default function AuthPage() {
  const router = useRouter();
  const { login, register, user, isLoading } = useAuthStore();
  const { showToast } = useToast();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const handleSignIn = async (data: { email: string; password: string }) => {
    try {
      setError("");
      
      await login({ email: data.email, password: data.password });
      
      showToast("Welcome back! Redirecting to dashboard...", "success");
      
      // Use replace to avoid back button issues
      setTimeout(() => {
        router.replace("/dashboard");
      }, 100);
    } catch (err: unknown) {
      const error = err as ApiError;
      
      // Extract proper error message
      let errorMsg = "Failed to sign in. Please check your credentials.";
      
      if (error?.response?.data) {
        const data = error.response.data;
        // Backend returned structured error
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.detail) {
          errorMsg = typeof data.detail === 'string' ? data.detail : data.detail.toString();
        } else if (data.message) {
          errorMsg = data.message;
        }
      } else if (error?.message && typeof error.message === 'string') {
        errorMsg = error.message;
      }
      
      setError(errorMsg);
      showToast(errorMsg, "error");
    }
  };

  const handleSignUp = async (data: { name: string; email: string; password: string; role?: string }) => {
    try {
      setError("");
      
      await register({
        username: data.name,
        email: data.email,
        password: data.password,
        role: (data.role || "USER") as UserRole,
      });
      
      showToast("Account created successfully! You are now logged in.", "success");
      
      // Use replace to avoid back button issues
      setTimeout(() => {
        router.replace("/dashboard");
      }, 100);
    } catch (err: unknown) {
      const error = err as ApiError;
      
      // Extract proper error message
      let errorMsg = "Failed to create account. Please try again.";
      
      if (error?.response?.data) {
        const data = error.response.data;
        // Backend returned structured error
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.detail) {
          // Handle both string and array formats
          if (Array.isArray(data.detail)) {
            errorMsg = data.detail.map((e: ApiErrorDetail) => e.msg || e.message || '').join(', ');
          } else {
            errorMsg = data.detail;
          }
        } else if (data.message) {
          errorMsg = data.message;
        }
      } else if (error?.message && typeof error.message === 'string') {
        errorMsg = error.message;
      }
      
      setError(errorMsg);
      showToast(errorMsg, "error");
    }
  };

  return (
    <div className="relative">
      {error && (
        <div className="fixed top-4 right-4 z-50 max-w-md rounded-lg bg-red-500 p-4 text-white shadow-lg">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setError("")}
            className="absolute top-2 right-2 text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Demo Credentials Banner */}
      <div className="fixed top-4 left-4 z-50 max-w-sm rounded-lg bg-blue-500/90 backdrop-blur-sm p-4 text-white shadow-xl border border-blue-400/50">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-2">Demo Mode Active</p>
            <p className="text-sm text-blue-100 mb-2">Backend unavailable. Use these credentials:</p>
            <div className="space-y-2 text-sm">
              <div className="bg-blue-600/30 rounded px-2 py-1">
                <p className="font-mono text-blue-100">{MOCK_CREDENTIALS.demo.email}</p>
                <p className="font-mono text-blue-100">{MOCK_CREDENTIALS.demo.password}</p>
              </div>
              <div className="bg-blue-600/30 rounded px-2 py-1">
                <p className="font-mono text-blue-100">{MOCK_CREDENTIALS.admin.email}</p>
                <p className="font-mono text-blue-100">{MOCK_CREDENTIALS.admin.password}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <AuthUI
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        isLoading={isLoading}
        showRole={true}
        showGoogleAuth={false}
      />
    </div>
  );
}
