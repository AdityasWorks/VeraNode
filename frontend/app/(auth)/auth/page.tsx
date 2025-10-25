"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AuthUI } from "@/components/ui/auth-fuse";

export default function AuthPage() {
  const router = useRouter();
  const { login, register, user, isLoading } = useAuthStore();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const handleSignIn = async (data: { email: string; password: string }) => {
    try {
      setError("");
      console.log("=== LOGIN ATTEMPT ===");
      console.log("Email:", data.email);
      console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
      
      await login({ email: data.email, password: data.password });
      
      console.log("=== LOGIN SUCCESS ===");
      console.log("User:", user);
      
      // Use replace to avoid back button issues
      setTimeout(() => {
        router.replace("/dashboard");
      }, 100);
    } catch (error: any) {
      console.error("=== LOGIN ERROR ===");
      console.error("Full error:", error);
      
      // Extract proper error message
      let errorMsg = "Failed to sign in. Please check your credentials.";
      
      if (error?.response?.data) {
        // Backend returned structured error
        if (typeof error.response.data === 'string') {
          errorMsg = error.response.data;
        } else if (error.response.data.detail) {
          errorMsg = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMsg = error.response.data.message;
        }
      } else if (error?.message && typeof error.message === 'string') {
        errorMsg = error.message;
      }
      
      console.error("Extracted error message:", errorMsg);
      setError(errorMsg);
      alert(`Login Error: ${errorMsg}`);
    }
  };

  const handleSignUp = async (data: { name: string; email: string; password: string; role?: string }) => {
    try {
      setError("");
      console.log("=== REGISTRATION ATTEMPT ===");
      console.log("Data:", { name: data.name, email: data.email, role: data.role });
      console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
      
      await register({
        username: data.name,
        email: data.email,
        password: data.password,
        role: (data.role || "USER") as any,
      });
      
      console.log("=== REGISTRATION SUCCESS ===");
      alert("Account created successfully! You are now logged in.");
      
      // Use replace to avoid back button issues
      setTimeout(() => {
        router.replace("/dashboard");
      }, 100);
    } catch (error: any) {
      console.error("=== REGISTRATION ERROR ===");
      console.error("Full error:", error);
      
      // Extract proper error message
      let errorMsg = "Failed to create account. Please try again.";
      
      if (error?.response?.data) {
        // Backend returned structured error
        if (typeof error.response.data === 'string') {
          errorMsg = error.response.data;
        } else if (error.response.data.detail) {
          // Handle both string and array formats
          if (Array.isArray(error.response.data.detail)) {
            errorMsg = error.response.data.detail.map((e: any) => e.msg || e).join(', ');
          } else {
            errorMsg = error.response.data.detail;
          }
        } else if (error.response.data.message) {
          errorMsg = error.response.data.message;
        }
      } else if (error?.message && typeof error.message === 'string') {
        errorMsg = error.message;
      }
      
      console.error("Extracted error message:", errorMsg);
      setError(errorMsg);
      alert(`Registration Error: ${errorMsg}`);
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
