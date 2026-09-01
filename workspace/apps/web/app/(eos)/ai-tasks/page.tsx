"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import React, { useMemo, Suspense } from "react";
import { AITaskCard } from "@repo/presentation-features/ai/AITaskCard";
import { WorkSummaryCards } from "@repo/presentation-features/work/WorkSummaryCards";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";

// Server-side session resolution - thin server adapter pattern compliance
async function resolveSessionOrEnter() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  if (!sessionCookie?.value) redirect("/enter");
  const session = decodeWorkspaceSession(sessionCookie.value);
  if (!session || !session.sessionId || !session.tenantId || !session.workspaceId || !session.actorId) {
    redirect("/enter");
  }
  return session;
}

// Main page component - server component
export default async function AITasksPage() {
  const session = await resolveSessionOrEnter();
  
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <Suspense fallback={<div className="p-8 text-center">Loading AI tasks...</div>}>
        <AITasksContent workspaceId={session.workspaceId} />
      </Suspense>
    </div>
  );
}

// Client component only contains presentation logic, no session/auth logic
function AITasksContent({ workspaceId }: { workspaceId: string }) {
  // Mock data until atomic composition service dependencies are resolved - EOS Face priority first
  const activeTasks: any[] = [];
  const taskHistory: any[] = [];
  const allTasks = useMemo(() => [...activeTasks, ...taskHistory], [activeTasks, taskHistory]);
  
  // Mock metrics for WorkSummaryCards
  const aiMetrics = useMemo(() => ({
    total: 0,
    processing: 0,
    failed: 0,
    completed: 0
  }), []);

  // Simplified connection status until realtime dependencies are restored
  const isConnected = false;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Tugas AI Agent</h1>
        <p className="mt-2 text-text-secondary">
          Daftar semua tugas AI agent di workspace: {workspaceId}
          <span className={`ml-4 inline-flex items-center gap-2 w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
          <span className="text-xs text-gray-500 ml-2">{isConnected ? 'Realtime terhubung' : 'Menghubungkan...'}</span>
        </p>
      </header>

      {/* Reuse existing WorkSummaryCards for AI metrics */}
      <section className="bg-surface-elevated/60 border border-surface-border/60 rounded-xl p-4">
        <WorkSummaryCards
          total={aiMetrics.total}
          inProgress={aiMetrics.processing}
          bottlenecked={aiMetrics.failed}
          completed={aiMetrics.completed}
          aiProcessing={aiMetrics.processing}
          aiFailed={aiMetrics.failed}
          workspaceId={workspaceId}
          compact={false}
        />
      </section>

      {/* Task list - reuse existing card pattern */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Semua Tasks</h2>
        {allTasks.length === 0 ? (
          <div className="bg-surface-sunken rounded-xl p-8 text-center">
            <p className="text-text-secondary">Tidak ada AI tasks di workspace ini.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allTasks.map((task) => (
              <AITaskCard key={task.bindingId + task.startedAt} task={task} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}