"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/ui/toast-provider";
import { AuthUI } from "@/components/ui/auth-fuse";
import { UserRole } from "@/types/auth";

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
