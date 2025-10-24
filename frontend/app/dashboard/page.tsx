"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, checkAuth } = useAuthStore();

  useEffect(() => {
    // Check authentication status on mount
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // Redirect to auth if not authenticated
    if (!isAuthenticated) {
      router.replace("/auth");
    }
  }, [isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/auth");
  };

  // Show loading state while checking auth
  if (!user || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">VeraNode Dashboard</h1>
          <button
            onClick={handleLogout}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Logout
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* User Info Card */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">User Information</h2>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Email:</span> {user.email}
              </p>
              <p className="text-sm">
                <span className="font-medium">Username:</span> {user.username}
              </p>
              <p className="text-sm">
                <span className="font-medium">Role:</span> {user.role}
              </p>
              <p className="text-sm">
                <span className="font-medium">Status:</span>{" "}
                <span className={user.is_active ? "text-green-600" : "text-red-600"}>
                  {user.is_active ? "Active" : "Inactive"}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Quick Stats</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Models Registered</span>
                <span className="text-2xl font-bold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Proofs Generated</span>
                <span className="text-2xl font-bold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Verifications</span>
                <span className="text-2xl font-bold">0</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent">
                Register New Model
              </button>
              <button className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent">
                Generate Proof
              </button>
              <button className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent">
                View Verifications
              </button>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="mt-8 rounded-lg border border-border bg-card p-6">
          <h2 className="mb-2 text-xl font-semibold">
            Welcome to VeraNode, {user.username}!
          </h2>
          <p className="text-muted-foreground">
            VeraNode is a decentralized AI model verification platform using zero-knowledge
            machine learning (ZKML). Here you can register AI models, generate cryptographic
            proofs of their outputs, and verify model integrity without exposing sensitive
            data.
          </p>
        </div>
      </div>
    </div>
  );
}
