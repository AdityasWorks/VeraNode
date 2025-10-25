"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/ui/toast-provider";
import { motion, AnimatePresence } from "framer-motion";
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
import { ModelsTable, type Model } from "@/components/ui/models-data-table";
import { ProofJobsTable, type ProofJob } from "@/components/ui/proof-jobs-table";

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
  onButtonClick: () => {
    // TODO: Navigate to full jobs list
    // For now, show a toast notification
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('show-toast', { 
        detail: { message: 'Full proof jobs list feature coming soon!', type: 'info' } 
      });
      window.dispatchEvent(event);
    }
  },
};

// Sample proof jobs data (adapted from leads structure)
const sampleProofJobs = [
  {
    id: "1",
    name: "ResNet50 Inference",
    email: "resnet.user@zkml.io",
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
    email: "gpt2.user@zkml.io",
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
    email: "bert.classifier@zkml.io",
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
    email: "vgg16.detector@zkml.io",
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
    email: "mobilenet.user@zkml.io",
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
  const { user, isAuthenticated, logout, checkAuth, accessToken } = useAuthStore();
  const { showToast } = useToast();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [modelName, setModelName] = useState("");
  const [modelType, setModelType] = useState<'onnx' | 'pytorch' | 'tensorflow'>('onnx');
  const [description, setDescription] = useState("");
  const [myModels, setMyModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [generatingProof, setGeneratingProof] = useState<number | null>(null);
  const [proofJobs, setProofJobs] = useState<ProofJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [activeProofsByModel, setActiveProofsByModel] = useState<Set<number>>(new Set());

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

  const handleUploadModel = async () => {
    if (!uploadFile || !modelName || !accessToken) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch(
        `http://localhost:8000/api/v1/models/register?name=${encodeURIComponent(modelName)}&model_type=${modelType}&version=1.0.0&description=${encodeURIComponent(description || '')}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        
        // Handle duplicate model error specifically
        if (error.detail?.includes("already exists")) {
          showToast(`Model "${modelName}" already exists. Try a different name or version.`, "error");
        } else {
          showToast(error.detail || 'Upload failed', "error");
        }
        setUploading(false);
        return;
      }

      const model = await response.json();
      showToast(`✓ Model "${modelName}" uploaded successfully!`, "success");
      
      // Reset form and refresh model list
      setShowUploadModal(false);
      setUploadFile(null);
      setModelName("");
      setDescription("");
      setModelType('onnx');
      
      // Reload models list
      await fetchMyModels();
    } catch (error: any) {
      console.error('Upload error:', error);
      showToast(error.message || "Failed to upload model", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!modelName) {
        setModelName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  // Fetch user's models
  const fetchMyModels = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/models/my-models', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMyModels(data.models || []);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  // Fetch user's proof jobs
  const fetchProofJobs = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/verification/my-proofs', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const jobs: ProofJob[] = await response.json();
        
        // Enrich jobs with model names
        const enrichedJobs = await Promise.all(
          jobs.map(async (job) => {
            const model = myModels.find(m => m.id === job.model_id);
            return {
              ...job,
              model_name: model?.name || `Model #${job.model_id}`,
            };
          })
        );
        
        setProofJobs(enrichedJobs);
        
        // Track which models have active proofs
        const activeModels = new Set<number>();
        enrichedJobs.forEach(job => {
          if (job.status === "PENDING" || job.status === "PROCESSING") {
            activeModels.add(job.model_id);
          }
        });
        setActiveProofsByModel(activeModels);
      }
    } catch (error) {
      console.error('Failed to fetch proof jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  // Combined fetch function
  const fetchAllData = async () => {
    await fetchMyModels();
    await fetchProofJobs();
  };

  // Generate proof for a model
  const handleGenerateProof = async (modelId: number) => {
    // Check if model already has an active proof
    if (activeProofsByModel.has(modelId)) {
      showToast("This model already has a proof job in progress", "error");
      return;
    }

    setGeneratingProof(modelId);
    try {
      // For now, use dummy input data - in production this should be collected from user
      const proofData = {
        model_id: modelId,
        input_data: {
          dummy: true,
          note: "Sample input for proof generation"
        }
      };

      const response = await fetch(`http://localhost:8000/api/v1/verification/generate-proof`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proofData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Proof generation failed');
      }

      const result = await response.json();
      showToast(`✓ Proof generation started! Job ID: ${result.id}`, "success");
      
      // Refresh data immediately
      await fetchAllData();
      
    } catch (error: any) {
      console.error('Proof generation error:', error);
      showToast(error.message || "Failed to generate proof", "error");
    } finally {
      setGeneratingProof(null);
    }
  };

  // Load models on mount
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchAllData();
    }
  }, [isAuthenticated, accessToken]);

  // Set up polling for real-time updates (every 5 seconds)
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const pollInterval = setInterval(() => {
      // Only poll if there are active proof jobs
      const hasActiveJobs = proofJobs.some(
        job => job.status === "PENDING" || job.status === "PROCESSING"
      );
      
      if (hasActiveJobs) {
        fetchProofJobs();
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [isAuthenticated, accessToken, proofJobs]);

  // Quick actions configuration with descriptions
  const quickActions = [
    {
      icon: <ClipboardList className="h-full w-full text-foreground/90" />,
      label: "Register Model",
      description: "Upload a new AI model for verification",
      onClick: () => {
        setShowUploadModal(true);
      },
    },
    {
      icon: <ArrowDownLeftFromSquare className="h-full w-full text-foreground/90" />,
      label: "View Jobs",
      description: "Check proof generation status",
      onClick: () => {
        showToast("Viewing your proof jobs below", "info");
      },
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
    <div className="min-h-screen bg-background relative">
      {/* Background with fixed positioning */}
      <div className="fixed inset-0 pointer-events-none">
        <BeamsBackground intensity="subtle" className="h-full w-full" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10">
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
                  <div className="text-2xl font-bold">{myModels.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-green-600 dark:text-green-400">
                      {myModels.filter(m => !activeProofsByModel.has(m.id)).length}
                    </span> ready
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
                  <div className="text-2xl font-bold">
                    {proofJobs.filter(j => j.status === "PENDING" || j.status === "PROCESSING").length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-blue-600 dark:text-blue-400">
                      {proofJobs.filter(j => j.status === "PROCESSING").length} generating
                    </span>
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
                  <div className="text-2xl font-bold">
                    {proofJobs.filter(j => j.status === "COMPLETED").length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-red-600 dark:text-red-400">
                      {proofJobs.filter(j => j.status === "FAILED").length}
                    </span> failed
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
                  <div className="text-2xl font-bold">
                    {proofJobs.length > 0 
                      ? ((proofJobs.filter(j => j.status === "COMPLETED").length / proofJobs.length) * 100).toFixed(1)
                      : "0.0"}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {proofJobs.length > 0 ? (
                      <span className="text-muted-foreground">
                        {proofJobs.length} total jobs
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No jobs yet</span>
                    )}
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
                  onFilterClick={() => {
                    // TODO: Implement filter functionality
                  }}
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

          {/* My Models Table */}
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-border/30 bg-card/70 backdrop-blur-md p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">My Models</h2>
                  <p className="text-sm text-muted-foreground">
                    View and manage your uploaded models. Generate ZK proofs for verification.
                  </p>
                </div>
                {!loadingModels && myModels.length > 0 && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload New Model
                  </button>
                )}
              </div>
              
              {loadingModels ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : myModels.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">No models uploaded yet</p>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Upload Your First Model
                  </button>
                </div>
              ) : (
                <ModelsTable
                  models={myModels.map(m => ({ ...m, hasActiveProof: activeProofsByModel.has(m.id) }))}
                  onGenerateProof={handleGenerateProof}
                  generatingProofId={generatingProof}
                />
              )}
            </div>
          </motion.div>

          {/* Active Proof Jobs Table */}
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-border/30 bg-card/70 backdrop-blur-md p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Active Proof Jobs</h2>
                  <p className="text-sm text-muted-foreground">
                    Real-time monitoring of your zkML proof generation tasks
                  </p>
                </div>
                {!loadingJobs && proofJobs.length > 0 && (
                  <button
                    onClick={fetchAllData}
                    className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Refresh
                  </button>
                )}
              </div>
              
              {loadingJobs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ProofJobsTable
                  proofJobs={proofJobs}
                  onRefresh={fetchAllData}
                />
              )}
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

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !uploading && setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Upload Model</h2>
                  <button
                    onClick={() => !uploading && setShowUploadModal(false)}
                    disabled={uploading}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* File Upload Area */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Model File *
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                      uploadFile 
                        ? 'border-green-500 bg-green-50/10' 
                        : 'border-border hover:border-primary/50 bg-muted/20'
                    }`}
                  >
                    {uploadFile ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileCheck className="w-8 h-8 text-green-600" />
                          <div className="text-left">
                            <p className="font-medium text-foreground">{uploadFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setUploadFile(null)}
                          disabled={uploading}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-foreground mb-2">Drag and drop your model file here</p>
                        <p className="text-sm text-muted-foreground mb-4">or</p>
                        <label className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer transition-colors">
                          Browse Files
                          <input
                            type="file"
                            onChange={handleFileSelect}
                            disabled={uploading}
                            className="hidden"
                            accept=".onnx,.pt,.pth,.pb,.h5"
                          />
                        </label>
                      </>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                {uploadFile && (
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Model Name *
                      </label>
                      <input
                        type="text"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        disabled={uploading}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                        placeholder="My AI Model"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Model Type *
                      </label>
                      <select
                        value={modelType}
                        onChange={(e) => setModelType(e.target.value as any)}
                        disabled={uploading}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                      >
                        <option value="onnx">ONNX</option>
                        <option value="pytorch">PyTorch</option>
                        <option value="tensorflow">TensorFlow</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={uploading}
                        rows={3}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                        placeholder="Describe your model..."
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {uploadFile && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => !uploading && setShowUploadModal(false)}
                      disabled={uploading}
                      className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUploadModel}
                      disabled={!modelName || uploading}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground transition-colors font-medium"
                    >
                      {uploading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Uploading...
                        </span>
                      ) : (
                        'Upload Model'
                      )}
                    </button>
                  </div>
                )}

                <p className="mt-4 text-xs text-muted-foreground text-center">
                  Supported formats: ONNX, PyTorch (.pt, .pth), TensorFlow (.pb, .h5)
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
