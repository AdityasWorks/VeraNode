"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { motion } from "framer-motion";
import {
  Database,
  Clock,
  CheckCircle,
  TrendingUp,
  Upload,
  Zap,
  FileCheck,
  ArrowUpRightFromSquare,
  ArrowDownLeftFromSquare,
  ClipboardList,
  LogOut,
} from "lucide-react";
import { MarketingDashboard } from "@/components/ui/dashboard-stats";
import { LeadsTable } from "@/components/ui/leads-data-table";
import { QuickLinksCard } from "@/components/ui/quick-actions-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BeamsBackground } from "@/components/ui/beams-background";

// Sample data for the Marketing Dashboard (Team Activities)
const sampleTeamActivities = {
  totalHours: 24.8,
  stats: [
    { label: "Active", value: 35, color: "bg-emerald-400" },
    { label: "Pending", value: 30, color: "bg-amber-400" },
    { label: "Queued", value: 25, color: "bg-sky-400" },
    { label: "Failed", value: 10, color: "bg-slate-700 dark:bg-slate-600" },
  ],
};

const sampleTeam = {
  memberCount: 47,
  members: [
    { id: "1", name: "Olivia Martin", avatarUrl: "https://i.pravatar.cc/150?u=a042581f4e29026024d" },
    { id: "2", name: "Jackson Lee", avatarUrl: "https://i.pravatar.cc/150?u=a042581f4e29026704d" },
    { id: "3", name: "Isabella Nguyen", avatarUrl: "https://i.pravatar.cc/150?u=a04258114e29026302d" },
    { id: "4", name: "William Kim", avatarUrl: "https://i.pravatar.cc/150?u=a04258114e29026702d" },
  ],
};

const sampleCta = {
  text: "Monitor all proof generation activities in real-time",
  buttonText: "View All Jobs",
  onButtonClick: () => console.log("View All Jobs clicked"),
};

// Sample proof jobs data (adapted from leads structure)
const sampleProofJobs = [
  {
    id: "1",
    name: "ResNet50 Inference",
    email: "model@zkml.io",
    source: "ORGANIC",
    sourceType: "organic" as const,
    status: "closing" as const,
    size: 120000,
    interest: [45, 52, 48, 55, 58, 60, 57, 62, 65, 63],
    probability: "mid" as const,
    lastAction: "2 mins ago"
  },
  {
    id: "2",
    name: "GPT-2 Generation",
    email: "model@zkml.io",
    source: "BATCH-24",
    sourceType: "campaign" as const,
    status: "closed" as const,
    size: 200000,
    interest: [30, 35, 42, 48, 55, 62, 68, 70, 75, 78],
    probability: "high" as const,
    lastAction: "5 mins ago"
  },
  {
    id: "3",
    name: "BERT Classification",
    email: "model@zkml.io",
    source: "API-REQ",
    sourceType: "campaign" as const,
    status: "lost" as const,
    size: 45000,
    interest: [70, 68, 65, 60, 58, 55, 52, 48, 45, 42],
    probability: "low" as const,
    lastAction: "10 mins ago"
  },
  {
    id: "4",
    name: "VGG16 Detection",
    email: "model@zkml.io",
    source: "SCHEDULED",
    sourceType: "campaign" as const,
    status: "pre-sale" as const,
    size: 80000,
    interest: [25, 28, 32, 38, 45, 52, 58, 62, 68, 70],
    probability: "high" as const,
    lastAction: "15 mins ago"
  },
  {
    id: "5",
    name: "MobileNet Inference",
    email: "model@zkml.io",
    source: "ORGANIC",
    sourceType: "organic" as const,
    status: "lost" as const,
    size: 110000,
    interest: [60, 58, 55, 50, 45, 42, 38, 35, 30, 28],
    probability: "low" as const,
    lastAction: "1 hour ago"
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth");
    }
  }, [isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/auth");
  };

  // Quick actions configuration with descriptions
  const quickActions = [
    {
      icon: <ClipboardList className="h-full w-full text-foreground/90" />,
      label: "Register Model",
      description: "Upload a new AI model for verification",
      onClick: () => console.log("Register Model action"),
    },
    {
      icon: <ArrowUpRightFromSquare className="h-full w-full text-foreground/90" />,
      label: "Generate Proof",
      description: "Create zkML proof for your model",
      onClick: () => console.log("Generate Proof action"),
    },
    {
      icon: <ArrowDownLeftFromSquare className="h-full w-full text-foreground/90" />,
      label: "Verify Proof",
      description: "Validate existing cryptographic proofs",
      onClick: () => console.log("Verify Proof action"),
    },
  ];

  // Loading state
  if (!user || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading dashboard...</p>
        </motion.div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 24,
      },
    },
  };

  return (
    <BeamsBackground intensity="subtle" className="min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 backdrop-blur-xl bg-background/95 border-b border-border/40 shadow-sm"
      >
        <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                  <Database className="h-5 w-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                  VeraNode
                </h1>
              </div>
              <div className="hidden sm:block h-6 w-px bg-border/50" />
              <p className="hidden sm:block text-sm text-muted-foreground">
                Welcome back, <span className="font-medium text-foreground">{user.username}</span>
              </p>
            </div>
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 text-sm font-medium transition-all shadow-md hover:shadow-lg"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Stats Cards Row */}
          <motion.div variants={itemVariants}>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Total Models */}
              <Card className="overflow-hidden relative group hover:shadow-lg transition-shadow bg-card/80 backdrop-blur-sm border-border/50">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Models
                  </CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-green-600 dark:text-green-400">+2</span> this week
                  </p>
                </CardContent>
              </Card>

              {/* Active Jobs */}
              <Card className="overflow-hidden relative group hover:shadow-lg transition-shadow bg-card/80 backdrop-blur-sm border-border/50">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Jobs
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-blue-600 dark:text-blue-400">2 generating</span>
                  </p>
                </CardContent>
              </Card>

              {/* Completed Proofs */}
              <Card className="overflow-hidden relative group hover:shadow-lg transition-shadow bg-card/80 backdrop-blur-sm border-border/50">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Completed
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">156</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-green-600 dark:text-green-400">+18</span> today
                  </p>
                </CardContent>
              </Card>

              {/* Success Rate */}
              <Card className="overflow-hidden relative group hover:shadow-lg transition-shadow bg-card/80 backdrop-blur-sm border-border/50">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Success Rate
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">98.7%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-green-600 dark:text-green-400">+0.3%</span> improvement
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Middle Section: Activity Stats + Quick Actions */}
          <motion.div variants={itemVariants}>
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Marketing Dashboard (Activity Stats) - Takes 2 columns */}
              <div className="lg:col-span-2">
                <MarketingDashboard
                  title="Proof Generation Activities"
                  teamActivities={sampleTeamActivities}
                  team={sampleTeam}
                  cta={sampleCta}
                  onFilterClick={() => console.log("Filter clicked")}
                  className="bg-card/70 backdrop-blur-sm border-border/50"
                />
              </div>

              {/* Quick Actions - Takes 1 column */}
              <div className="flex items-start">
                <QuickLinksCard
                  title="Quick Actions"
                  subtitle="Essential Operations"
                  actions={quickActions}
                  className="w-full bg-card/70 backdrop-blur-sm border-border/50"
                />
              </div>
            </div>
          </motion.div>

          {/* Active Proof Jobs Table */}
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-border/30 bg-card/70 backdrop-blur-md p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Active Proof Jobs</h2>
                <p className="text-sm text-muted-foreground">
                  Monitor and manage your ongoing zkML proof generation tasks
                </p>
              </div>
              <LeadsTable
                leads={sampleProofJobs}
                onLeadAction={(leadId, action) =>
                  console.log(`Action ${action} on proof job ${leadId}`)
                }
              />
            </div>
          </motion.div>

          {/* Footer Info */}
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden bg-card/80 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Platform Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-2 text-foreground">About VeraNode</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      VeraNode is a decentralized AI model verification platform using zero-knowledge
                      machine learning (ZKML). Generate cryptographic proofs for AI model outputs
                      while maintaining data privacy and model integrity.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-foreground">Your Account</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{user.email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Role:</span>
                        <span className="font-medium capitalize">{user.role}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                            user.is_active
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? "bg-green-600" : "bg-red-600"}`} />
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </BeamsBackground>
  );
}
