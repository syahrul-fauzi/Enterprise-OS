"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import { useWorkspaceSession, useLocale, usePageStates } from "@repo/presentation-hooks";
import { WorkRealityLoading, ErrorState, PermissionDenied } from "@repo/presentation-ui-system";
import type { ProductPreviewBinding } from "@repo/presentation-experience";
import type { ServiceRequestAggregate, ServiceRequestStatus, ServiceRequestPriority } from "@capabilities/services-id/implementation/contracts/service-request.contracts";

const SRV_WORKFLOW = {
  steps: [
    { id: "draft" as const, label: "Draf" },
    { id: "open" as const, label: "Buka" },
    { id: "in_progress" as const, label: "Dikerjakan" },
    { id: "closed" as const, label: "Selesai" },
  ],
};

export interface ServiceRequestDetailPageProps {
  readonly productId: string;
  readonly requestId: string;
  readonly binding: ProductPreviewBinding;
  readonly session: unknown;
}

type StepState = "done" | "current" | "pending";

interface CapabilityStep {
  readonly id: string;
  readonly label: string;
  readonly state: StepState;
}

const STATUS_LABEL: Record<ServiceRequestStatus, string> = {
  draft: "Draf",
  open: "Buka",
  in_progress: "Dikerjakan",
  closed: "Selesai",
};

const STATUS_DOT: Record<ServiceRequestStatus, string> = {
  draft: "bg-slate-400",
  open: "bg-amber-500",
  in_progress: "bg-blue-500",
  closed: "bg-emerald-500",
};

const PRIORITY_LABEL: Record<ServiceRequestPriority, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  critical: "Kritis",
};

const PRIORITY_DOT: Record<ServiceRequestPriority, string> = {
  low: "bg-slate-400",
  medium: "bg-blue-400",
  high: "bg-orange-400",
  critical: "bg-red-500",
};

function fmtAt(d: Date): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const day = today.getDate();
  const at = new Date(d);
  const sameDay = at.getFullYear() === y && at.getMonth() === m && at.getDate() === day;
  const yesterday = new Date(today);
  yesterday.setDate(day - 1);
  const isYesterday = at.getFullYear() === yesterday.getFullYear() && at.getMonth() === yesterday.getMonth() && at.getDate() === yesterday.getDate();
  const hh = String(at.getHours()).padStart(2, "0");
  const mm = String(at.getMinutes()).padStart(2, "0");
  if (sameDay) return `Hari ini ${hh}:${mm}`;
  if (isYesterday) return `Kemarin ${hh}:${mm}`;
  return `${at.toLocaleDateString('id-ID')} ${hh}:${mm}`;
}

function deriveSteps(d: ServiceRequestAggregate | null): readonly CapabilityStep[] {
  if (!d) return SRV_WORKFLOW.steps.map(s => ({ id: s.id, label: s.label, state: s.id === "draft" ? "current" : "pending" as StepState }));
  
  return SRV_WORKFLOW.steps.map(s => {
    const order = ["draft", "open", "in_progress", "closed"];
    const currentIdx = order.indexOf(d.status);
    const stepIdx = order.indexOf(s.id);
    let state: StepState = "pending";
    if (stepIdx < currentIdx) state = "done";
    else if (stepIdx === currentIdx) state = "current";
    else state = "pending";
    return { id: s.id, label: s.label, state };
  });
}

export function ServiceRequestDetailPage({ productId, requestId, binding, session: serverSession }: ServiceRequestDetailPageProps) {
  const { session, authenticated, cachedSession } = useWorkspaceSession();
  const { t } = useLocale();
  const currentSession = session ?? cachedSession;
  const isAuthenticated = Boolean(currentSession?.actorId && currentSession?.actorId !== "anonymous.user") || authenticated;
  
  // State management menggunakan usePageStates hook untuk standarisasi 9 UX states
  const {
    state,
    isLoading,
    hasError,
    setLoading,
    setSuccess,
    setError,
    setPermissionDenied,
  } = usePageStates<ServiceRequestAggregate>({
    initialData: null,
  });
  const [requestData, setRequestData] = useState<ServiceRequestAggregate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadRequest = useCallback(async () => {
    if (!requestId || !isAuthenticated) {
      setPermissionDenied();
      return;
    }
    setLoading();
    try {
      if (!currentSession?.sessionId || !currentSession.tenantId || !currentSession.workspaceId) {
        throw new Error("Sesi tidak valid - silakan masuk kembali untuk melihat permintaan layanan");
      }

      const resp = await fetch("/api/capabilities/services-id/service-request.getById", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: requestId,
          tenantId: currentSession.tenantId,
          workspaceId: currentSession.workspaceId,
        }),
      });

      if (!resp.ok) throw new Error("Gagal memuat data permintaan layanan");
      const json = await resp.json();
      const data = json.output || null;
      setRequestData(data);
      if (data) {
        setSuccess(data);
      }
    } catch (err) {
      console.error("[ServiceRequestDetailPage] Failed to load request:", err);
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data");
    }
  }, [requestId, isAuthenticated, currentSession, setLoading, setSuccess, setError, setPermissionDenied]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  const steps = useMemo(() => deriveSteps(requestData), [requestData]);
  const currentStep = steps.find(s => s.state === "current");

  const handleUpdateStatus = async (newStatus: ServiceRequestStatus) => {
    if (!requestId || !requestData) return;
    setSubmitting(true);
    setError(null);
    try {
      if (!currentSession?.sessionId || !currentSession.tenantId || !currentSession.workspaceId || !currentSession.actorId) {
        throw new Error("Sesi tidak valid - silakan masuk kembali untuk memperbarui status");
      }

      // RL2-001: Map legacy status to canonical work transition commands
      const commandMap: Record<ServiceRequestStatus, string> = {
        draft: "review",
        open: "assign",
        in_progress: "approve",
        closed: "complete"
      };

      // Use canonical /api/work/[id] PUT endpoint with RL2-001 transition logic
      const resp = await fetch(`/api/work/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: commandMap[newStatus],
          actorId: currentSession.actorId,
          note: `Status diperbarui ke ${newStatus} oleh pengguna`,
          sessionId: currentSession.sessionId,
          tenantId: currentSession.tenantId,
          workspaceId: currentSession.workspaceId,
        }),
      });

      if (!resp.ok) throw new Error("Gagal memperbarui status permintaan");
      const result = await resp.json();
      console.log(`[ServiceRequestDetailPage] RL2-001: Transition executed:`, result);
      await loadRequest();
    } catch (err) {
      console.error("[ServiceRequestDetailPage] Failed to update status:", err);
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memperbarui status");
    } finally {
      setSubmitting(false);
    }
  };

  // Permission denied state (menggunakan shared component)
  if (state.status === "permission-denied") {
    return (
      <ProductPreviewShell binding={binding}>
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-2xl">
            <PermissionDenied
              title="Anda belum masuk"
              description="Silakan masuk terlebih dahulu untuk melihat detail permintaan layanan."
              icon="🔒"
              backLabel="Masuk ke Workspace"
              onBack={() => window.location.href = "/enter"}
            />
          </div>
        </main>
      </ProductPreviewShell>
    );
  }

  // Loading state (menggunakan shared component)
  if (isLoading) {
    return (
      <ProductPreviewShell binding={binding} mode="detail">
        <WorkRealityLoading />
      </ProductPreviewShell>
    );
  }

  // Error state (menggunakan shared component)
  if (hasError) {
    return (
      <ProductPreviewShell binding={binding} mode="detail">
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-2xl">
            <ErrorState
              title="Terjadi Kesalahan"
              description={state.error || "Gagal memuat data permintaan layanan"}
              icon="⚠️"
              retryLabel="Muat Ulang"
              onRetry={loadRequest}
            />
          </div>
        </main>
      </ProductPreviewShell>
    );
  }

  return (
    <>
      <ProductPreviewShell binding={binding} mode="detail" />
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl">
          {state.error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 mb-6">
              <p className="text-red-800 text-sm">{state.error}</p>
            </div>
          )}

          {/* Workflow Steps */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 mb-6">
            <div className="grid grid-cols-4 gap-4">
              {steps.map((step) => (
                <div key={step.id} className="text-center">
                  <div className={`inline-block h-3 w-3 rounded-full mb-2 ${step.state === "done" ? "bg-emerald-500" : step.state === "current" ? "bg-amber-500 animate-pulse" : "bg-slate-300"}`} />
                  <p className="text-xs font-medium text-slate-700">{step.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Request Header */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                    {loading ? "Memuat Permintaan…" : requestData ? requestData.title : "Permintaan tidak ditemukan"}
                  </h1>
                  <div className="flex gap-4 font-mono text-xs tracking-wide text-slate-500">
                    <span>SRV-{requestId}</span>
                    {requestData?.createdAt && <span>Dibuat: {fmtAt(requestData.createdAt)}</span>}
                  </div>
                </div>
                {requestData && (
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[requestData.status]}`} />
                    <span className="text-xs font-semibold text-slate-900">{STATUS_LABEL[requestData.status]}</span>
                    <span className={`h-2.5 w-2.5 rounded-full ml-3 ${PRIORITY_DOT[requestData.priority]}`} />
                    <span className="text-xs font-semibold text-slate-900">{PRIORITY_LABEL[requestData.priority]}</span>
                  </div>
                )}
              </div>

              {requestData?.description && (
                <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  {requestData.description}
                </p>
              )}

              {requestData?.category && (
                <div className="mt-4 inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Kategori: {requestData.category}
                </div>
              )}

              {/* Status update actions */}
              {!loading && requestData && requestData.status !== "closed" && (
                <div className="mt-6 flex gap-3">
                  {requestData.status === "draft" && (
                    <button
                      onClick={() => handleUpdateStatus("open")}
                      disabled={submitting}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                      {submitting ? "Memproses..." : "Buka Permintaan"}
                    </button>
                  )}
                  {requestData.status === "open" && (
                    <button
                      onClick={() => handleUpdateStatus("in_progress")}
                      disabled={submitting}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {submitting ? "Memproses..." : "Mulai Kerjakan"}
                    </button>
                  )}
                  {requestData.status === "in_progress" && (
                    <button
                      onClick={() => handleUpdateStatus("closed")}
                      disabled={submitting}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      {submitting ? "Memproses..." : "Selesaikan Permintaan"}
                    </button>
                  )}
                </div>
              )}

              {currentStep && (
                <p className="mt-6 text-sm text-slate-600">
                  <span className="font-medium">Status saat ini:</span> {currentStep.label === "Draf" ? "Selesaikan detail permintaan, lalu buka untuk diproses." :
                   currentStep.label === "Buka" ? "Permintaan menunggu penugasan ke tim yang sesuai." :
                   currentStep.label === "Dikerjakan" ? "Permintaan sedang dikerjakan oleh tim." :
                   "Permintaan telah selesai."}
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default ServiceRequestDetailPage;