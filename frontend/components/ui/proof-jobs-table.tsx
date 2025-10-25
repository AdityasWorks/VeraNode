"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, Zap, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";

export interface ProofJob {
  id: number;
  model_id: number;
  model_name?: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  celery_task_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

interface ProofJobsTableProps {
  proofJobs?: ProofJob[];
  onRefresh?: () => void;
  className?: string;
}

export function ProofJobsTable({
  proofJobs = [],
  onRefresh,
  className = "",
}: ProofJobsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const itemsPerPage = 5;

  // Sort data
  const sortedJobs = [...proofJobs].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any = a[sortColumn as keyof ProofJob];
    let bValue: any = b[sortColumn as keyof ProofJob];

    if (sortColumn === "created_at" || sortColumn === "started_at" || sortColumn === "completed_at") {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentJobs = sortedJobs.slice(startIndex, endIndex);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getElapsedTime = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return "-";
    const start = new Date(startDate).getTime();
    const end = endDate ? new Date(endDate).getTime() : Date.now();
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    if (diffMins > 0) return `${diffMins}m ${diffSecs}s`;
    return `${diffSecs}s`;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: {
        icon: <Clock className="h-3 w-3" />,
        text: "Pending",
        className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      },
      PROCESSING: {
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        text: "Processing",
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      },
      COMPLETED: {
        icon: <CheckCircle className="h-3 w-3" />,
        text: "Completed",
        className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
      },
      FAILED: {
        icon: <XCircle className="h-3 w-3" />,
        text: "Failed",
        className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      },
    };

    const badge = badges[status as keyof typeof badges] || badges.PENDING;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${badge.className}`}>
        {badge.icon}
        {badge.text}
      </span>
    );
  };

  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(column)}
      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
    >
      <div className="flex items-center gap-2">
        {children}
        {sortColumn === column && (
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              sortDirection === "desc" ? "rotate-180" : ""
            }`}
          />
        )}
      </div>
    </th>
  );

  if (proofJobs.length === 0) {
    return (
      <div className="text-center py-12">
        <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground mb-2">No proof jobs yet</p>
        <p className="text-sm text-muted-foreground">Generate a proof from your models to get started</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border/40">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <SortableHeader column="id">Job ID</SortableHeader>
              <SortableHeader column="model_name">Model</SortableHeader>
              <SortableHeader column="status">Status</SortableHeader>
              <SortableHeader column="created_at">Created</SortableHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-card/50 divide-y divide-border/40">
            <AnimatePresence mode="popLayout">
              {currentJobs.map((job, index) => (
                <motion.tr
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="hover:bg-muted/20 transition-colors"
                >
                  {/* Job ID */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Zap className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">#{job.id}</div>
                        {job.celery_task_id && (
                          <div className="text-xs text-muted-foreground font-mono">
                            {job.celery_task_id.slice(0, 8)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Model Name */}
                  <td className="px-4 py-4">
                    <div className="text-sm text-foreground font-medium">
                      {job.model_name || `Model #${job.model_id}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {job.model_id}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    {getStatusBadge(job.status)}
                  </td>

                  {/* Created At */}
                  <td className="px-4 py-4">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(job.created_at)}
                    </span>
                  </td>

                  {/* Duration */}
                  <td className="px-4 py-4">
                    <span className="text-sm text-muted-foreground font-mono">
                      {getElapsedTime(job.started_at || job.created_at, job.completed_at)}
                    </span>
                  </td>

                  {/* Details / Error */}
                  <td className="px-4 py-4">
                    {job.error_message ? (
                      <div className="text-xs text-red-600 dark:text-red-400 max-w-xs truncate">
                        {job.error_message}
                      </div>
                    ) : job.status === "COMPLETED" ? (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        Proof ready
                      </span>
                    ) : job.status === "PROCESSING" ? (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        Generating...
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        In queue
                      </span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, proofJobs.length)} of {proofJobs.length} jobs
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-border/40 hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted/50"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-border/40 hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
