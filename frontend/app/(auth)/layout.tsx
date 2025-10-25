"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user, checkAuth } = useAuthStore();

  useEffect(() => {
    // Check auth on mount
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (isAuthenticated && user) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  return <>{children}</>;
}
