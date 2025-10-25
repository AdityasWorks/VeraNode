"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, Zap, FileCheck, Clock } from "lucide-react";

export interface Model {
  id: number;
  name: string;
  model_type: string;
  version: string;
  created_at: string;
  model_size_bytes: number;
  is_public: boolean;
  owner_id: number;
  hasActiveProof?: boolean;
}

interface ModelsTableProps {
  models?: Model[];
  onGenerateProof?: (modelId: number) => void;
  generatingProofId?: number | null;
  className?: string;
}

export function ModelsTable({
  models = [],
  onGenerateProof,
  generatingProofId,
  className = "",
}: ModelsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const itemsPerPage = 5;

  // Sort data
  const sortedModels = [...models].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any = a[sortColumn as keyof Model];
    let bValue: any = b[sortColumn as keyof Model];

    if (sortColumn === "created_at") {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedModels.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentModels = sortedModels.slice(startIndex, endIndex);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getModelTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      onnx: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      pytorch: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      tensorflow: "bg-green-500/10 text-green-600 dark:text-green-400",
    };
    return colors[type.toLowerCase()] || "bg-gray-500/10 text-gray-600 dark:text-gray-400";
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

  if (models.length === 0) {
    return (
      <div className="text-center py-12">
        <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No models uploaded yet</p>
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
              <SortableHeader column="name">Model Name</SortableHeader>
              <SortableHeader column="model_type">Type</SortableHeader>
              <SortableHeader column="version">Version</SortableHeader>
              <SortableHeader column="model_size_bytes">Size</SortableHeader>
              <SortableHeader column="created_at">Uploaded</SortableHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card/50 divide-y divide-border/40">
            <AnimatePresence mode="popLayout">
              {currentModels.map((model, index) => (
                <motion.tr
                  key={model.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="hover:bg-muted/20 transition-colors"
                >
                  {/* Model Name */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{model.name}</div>
                        <div className="text-xs text-muted-foreground">ID: {model.id}</div>
                      </div>
                    </div>
                  </td>

                  {/* Model Type */}
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getModelTypeColor(model.model_type)}`}>
                      {model.model_type.toUpperCase()}
                    </span>
                  </td>

                  {/* Version */}
                  <td className="px-4 py-4">
                    <span className="text-sm text-foreground">v{model.version}</span>
                  </td>

                  {/* Size */}
                  <td className="px-4 py-4">
                    <span className="text-sm text-muted-foreground">
                      {formatFileSize(model.model_size_bytes)}
                    </span>
                  </td>

                  {/* Uploaded Date */}
                  <td className="px-4 py-4">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(model.created_at)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    {model.hasActiveProof ? (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <Clock className="h-4 w-4 animate-pulse" />
                        <span className="text-xs font-medium">Proof Pending</span>
                      </div>
                    ) : (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        Ready
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => onGenerateProof?.(model.id)}
                      disabled={generatingProofId === model.id || model.hasActiveProof}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {generatingProofId === model.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-foreground"></div>
                          Generating...
                        </>
                      ) : model.hasActiveProof ? (
                        <>
                          <Clock className="h-3 w-3" />
                          In Queue
                        </>
                      ) : (
                        <>
                          <Zap className="h-3 w-3" />
                          Generate Proof
                        </>
                      )}
                    </button>
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
            Showing {startIndex + 1} to {Math.min(endIndex, models.length)} of {models.length} models
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
