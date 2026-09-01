"use client";

import React from "react";
import { Card } from "@repo/presentation-ui-system";

// Re-define AIAgentTask interface locally since the source file doesn't export it from a separate contracts file
// This maintains type safety while fixing module resolution issues
export interface AIAgentTask {
  bindingId: string;
  capabilityReference: string;
  workDescription: string;
  actorId: string;
  prompt: string;
  status: "pending" | "processing" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  result?: string;
  evidenceUrl?: string;
  error?: string;
}

interface AITaskCardProps {
  task: AIAgentTask & { workspaceId?: string };
  onRestart?: (task: AIAgentTask) => void;
}

const statusConfig: Record<AIAgentTask["status"], {
  label: string;
  bgColor: string;
  textColor: string;
}> = {
  pending: { label: "Pending", bgColor: "bg-gray-100", textColor: "text-gray-800" },
  processing: { label: "Memproses", bgColor: "bg-blue-100", textColor: "text-blue-800" },
  completed: { label: "Selesai", bgColor: "bg-green-100", textColor: "text-green-800" },
  failed: { label: "Gagal", bgColor: "bg-red-100", textColor: "text-red-800" },
};

export function AITaskCard({ task, onRestart }: AITaskCardProps) {
  const status = statusConfig[task.status] ?? statusConfig.pending;

  const handleRestart = async () => {
    if (task.status === "failed") {
      try {
        await fetch("/api/ai-tasks/restart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task })
        });
        // Refresh page to show new task
        window.location.reload();
      } catch (error) {
        console.error("[AI TASK RESTART] Failed to restart task:", error);
      }
    }
  };

  return (
    <Card hoverable={task.status === "failed"} onClick={task.status === "failed" ? handleRestart : undefined}>
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-text-primary truncate">{task.workDescription}</h3>
            <p className="text-sm text-text-muted mt-1">Capability: {task.capabilityReference}</p>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium ${status.bgColor} ${status.textColor}`}>
            {status.label}
          </span>
        </div>
        
        <div className="text-xs text-text-muted space-y-1">
          <p>Mulai: {new Date(task.startedAt).toLocaleString("id-ID")}</p>
          {task.completedAt && <p>Selesai: {new Date(task.completedAt).toLocaleString("id-ID")}</p>}
          {task.error && <p className="text-status-danger">Error: {task.error}</p>}
        </div>

        {task.status === "failed" && (
          <button 
            className="w-full mt-2 px-3 py-1.5 text-sm font-medium text-text-inverse bg-status-danger rounded-lg hover:bg-status-danger/90"
            type="button"
          >
            Restart Task
          </button>
        )}
      </div>
    </Card>
  );
}