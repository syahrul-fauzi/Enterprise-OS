"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import type { ProductDeliveryCopy } from "@repo/presentation-experience";

type RequirementStatus =
  | "draft"
  | "approved"
  | "in_delivery"
  | "implemented"
  | "verified";

type VerificationStatus = "not_ready" | "pending" | "passed" | "failed";

export interface DeliveryWorkspaceProps {
  readonly productId: string;
  readonly displayName?: string;
  readonly requirementId?: string;
  readonly copy?: ProductDeliveryCopy;
}

interface DeliveryPayload {
  readonly requirement: {
    readonly id: string;
    readonly title: string;
    readonly summary?: string;
    readonly owner?: string;
    readonly status: RequirementStatus;
    readonly verificationStatus: VerificationStatus;
    readonly priority: string;
    readonly linkedCapabilityIds: readonly string[];
    readonly acceptanceCriteria: readonly string[];
  };
  readonly delivery: {
    readonly traceability: {
      readonly complete: boolean;
      readonly artifactCount: number;
      readonly verificationArtifactCount: number;
      readonly evidenceArtifactCount: number;
      readonly gaps: readonly string[];
    };
    readonly evidence: {
      readonly matchedCount: number;
      readonly latestUpdatedAt: string | null;
      readonly samplePaths: readonly string[];
    };
  } | null;
  readonly workflow: {
    readonly status: "passed" | "failed" | "skipped";
    readonly steps: ReadonlyArray<{
      readonly stepId: string;
      readonly kind: string;
      readonly status: "passed" | "failed" | "skipped";
      readonly summary: string;
    }>;
    readonly output: {
      readonly readyForWorkflow?: boolean;
      readonly evidenceCount?: number;
      readonly traceabilityGapCount?: number;
    };
  };
}

interface VerificationDecisionPayload {
  readonly predicateVersion: string;
  readonly verdict: "passed" | "failed";
  readonly lifecycleEligible: boolean;
  readonly decisionFingerprint: string;
  readonly evidenceSetHash: string;
  readonly registryProjection: {
    readonly traceabilityComplete: boolean;
    readonly artifactCount: number;
    readonly evidenceMatchedCount: number;
    readonly gaps: readonly string[];
  };
}

interface VerificationProofPayload {
  readonly proofId: string;
  readonly predicateId: string;
  readonly predicateVersion: string;
  readonly decision: "passed" | "failed";
  readonly proofDigest: string;
  readonly decisionFingerprint: string;
  readonly evaluatedAt: string;
  readonly provenance: {
    readonly evidencePaths: readonly string[];
    readonly evidenceIds: readonly string[];
  };
}

type DomainType = "lawyershub.case" | "services-id.request" | "ilc.discussion" | "ilc.article" | "academic.article" | null;

interface DomainLifecycleStep {
  readonly key: string;
  readonly label: string;
  readonly reached: boolean;
  readonly active: boolean;
}

interface DomainAggregateState {
  readonly type: NonNullable<DomainType>;
  readonly id: string;
  readonly displayTitle: string;
  readonly displaySubtitle: string;
  readonly rawStatus: string;
  readonly owner?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly lifecycle: readonly DomainLifecycleStep[];
  readonly availableActions: readonly DomainLifecycleAction[];
  readonly evidenceCount: number;
}

interface DomainLifecycleAction {
  readonly key: string;
  readonly label: string;
  readonly capability: string;
  readonly commandName: string;
  readonly buildInput: (id: string) => Record<string, unknown>;
  readonly tone: "primary" | "success";
}

function detectDomainType(id: string | undefined): DomainType {
  if (!id) return null;
  if (id.startsWith("case-")) return "lawyershub.case";
  if (id.startsWith("sreq-")) return "services-id.request";
  if (id.startsWith("disc-")) return "ilc.discussion";
  if (id.startsWith("content-")) return "ilc.article";
  if (/^req-\d+/i.test(id)) return null;
  return null;
}

function caseLifecycle(rawStatus: string): readonly DomainLifecycleStep[] {
  const order = ["draft", "open", "in_progress", "closed"] as const;
  const idx = order.indexOf(rawStatus as typeof order[number]);
  return order.map((s, i) => ({
    key: s,
    label: {
      draft: "Draf",
      open: "Buka / Ditetapkan",
      in_progress: "Sedang Dikerjakan",
      closed: "Selesai / Diserahkan",
    }[s],
    reached: idx === -1 ? i <= 0 : i <= idx,
    active: idx === i,
  }));
}

function serviceLifecycle(rawStatus: string): readonly DomainLifecycleStep[] {
  const order = ["draft", "accepted", "in_service", "delivered"] as const;
  const idx = order.indexOf(rawStatus as typeof order[number]);
  return order.map((s, i) => ({
    key: s,
    label: {
      draft: "Draf Permintaan",
      accepted: "Diterima (Provider Cocok)",
      in_service: "Sedang Dilayani",
      delivered: "Terserahkan / Tervalidasi",
    }[s],
    reached: idx === -1 ? i <= 0 : i <= idx,
    active: idx === i,
  }));
}

function articleLifecycle(rawStatus: string): readonly DomainLifecycleStep[] {
  const order = ["proposed", "accepted", "in_production", "published"] as const;
  const idx = order.indexOf(rawStatus as typeof order[number]);
  return order.map((s, i) => ({
    key: s,
    label: {
      proposed: "Diajukan / Dikirim",
      accepted: "Diterima Redaksi",
      in_production: "Sedang Produksi / Review",
      published: "Terpublikasi & Publik",
    }[s],
    reached: idx === -1 ? i <= 0 : i <= idx,
    active: idx === i,
  }));
}

function discussionLifecycle(rawStatus: string): readonly DomainLifecycleStep[] {
  const order = ["open", "featured", "locked"] as const;
  const idx = order.indexOf(rawStatus as typeof order[number]);
  return order.map((s, i) => ({
    key: s,
    label: {
      open: "Diskusi Terbuka",
      featured: "Diunggulkan / Disematkan",
      locked: "Ditutup / Diarsipkan",
    }[s],
    reached: idx === -1 ? i <= 0 : i <= idx,
    active: idx === i,
  }));
}

function caseActions(status: string): readonly DomainLifecycleAction[] {
  if (status === "draft") {
    return [
      {
        key: "assign_lawyer",
        label: "Tetapkan Penasihat Hukum → Buka Kasus",
        capability: "lawyershub",
        commandName: "assignLawyer",
        buildInput: (id) => ({ id, lawyerId: "lawyer-eos-d12" }),
        tone: "primary",
      },
    ];
  }
  if (status === "open" || status === "in_progress") {
    return [
      {
        key: "close",
        label: "Selesaikan Kasus",
        capability: "lawyershub",
        commandName: "close",
        buildInput: (id) => ({ id }),
        tone: "success",
      },
    ];
  }
  return [];
}

function serviceRequestActions(status: string): readonly DomainLifecycleAction[] {
  if (status === "draft") {
    return [
      {
        key: "accept",
        label: "Terima Permintaan (Tetapkan Provider)",
        capability: "services-id",
        commandName: "acceptServiceRequest",
        buildInput: (id) => ({ id, providerId: `provider-${id}-d12` }),
        tone: "primary",
      },
    ];
  }
  if (status === "accepted" || status === "in_service") {
    return [
      {
        key: "deliver",
        label: "Tandai Layanan Terserahkan",
        capability: "services-id",
        commandName: "markServiceDelivered",
        buildInput: (id) => ({ id }),
        tone: "success",
      },
    ];
  }
  return [];
}

function articleActions(status: string): readonly DomainLifecycleAction[] {
  if (status === "proposed" || status === "accepted" || status === "in_production") {
    return [
      {
        key: "publish",
        label: status === "proposed" ? "Terima & Publikasikan Artikel" : "Publikasikan Artikel",
        capability: "ilc",
        commandName: "publishContent",
        buildInput: (id) => ({ id }),
        tone: "success",
      },
    ];
  }
  return [];
}

function lifecycleStepTone(step: DomainLifecycleStep): string {
  if (step.active) return "border-indigo-300 bg-indigo-100 text-indigo-800";
  if (step.reached) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-100 text-slate-500";
}

function actionTone(tone: DomainLifecycleAction["tone"]): string {
  return tone === "primary"
    ? "bg-slate-950 text-white hover:bg-slate-800 disabled:opacity-50"
    : "bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50";
}

function statusTone(status: string): string {
  switch (status) {
    case "verified":
    case "passed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "implemented":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "in_delivery":
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "failed":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

async function readDelivery(requirementId: string): Promise<DeliveryPayload> {
  const response = await fetch(`/api/delivery?requirementId=${encodeURIComponent(requirementId)}`, {
    cache: "no-store",
  });

  if (response.status === 401) {
    await fetch("/api/session", { cache: "no-store" });
    const retry = await fetch(`/api/delivery?requirementId=${encodeURIComponent(requirementId)}`, {
      cache: "no-store",
    });
    if (!retry.ok) {
      throw new Error(`Failed to load delivery workspace (${retry.status})`);
    }
    return (await retry.json()) as DeliveryPayload;
  }

  if (!response.ok) {
    throw new Error(`Failed to load delivery workspace (${response.status})`);
  }

  return (await response.json()) as DeliveryPayload;
}

async function readRequirementRuntime<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });

  if (response.status === 401) {
    await fetch("/api/session", { cache: "no-store" });
    const retry = await fetch(path, { cache: "no-store" });
    if (!retry.ok) {
      throw new Error(`Failed to load runtime proof (${retry.status})`);
    }
    return (await retry.json()) as T;
  }

  if (!response.ok) {
    throw new Error(`Failed to load runtime proof (${response.status})`);
  }

  return (await response.json()) as T;
}

interface DomainResponse<T = unknown> {
  readonly ok: boolean;
  readonly error?: string;
  readonly type?: NonNullable<DomainType>;
  readonly id?: string;
  readonly displayTitle?: string;
  readonly displaySubtitle?: string;
  readonly rawStatus?: string;
  readonly owner?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly lifecycle?: readonly DomainLifecycleStep[];
  readonly evidenceCount?: number;
  readonly priority?: string;
  readonly category?: string;
  readonly budget?: string;
  readonly providerId?: string;
  readonly topicLabel?: string;
  readonly authorAffiliation?: string;
  readonly readCount?: number;
  readonly engagementCount?: number;
  readonly replyCount?: number;
  readonly viewCount?: number;
}

type LifecycleStep = DomainLifecycleStep;

export function DeliveryWorkspace({
  productId,
  displayName,
  requirementId,
  copy,
}: DeliveryWorkspaceProps) {
  const domainType = detectDomainType(requirementId);
  const [domainState, setDomainState] = useState<DomainResponse | null>(null);
  const [domainLoading, setDomainLoading] = useState(true);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainBusy, setDomainBusy] = useState<string | null>(null);
  const [domainResult, setDomainResult] = useState<{ at: number; ok: boolean; message: string } | null>(null);

  const [payload, setPayload] = useState<DeliveryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [latestArtifactPath, setLatestArtifactPath] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationDecisionPayload | null>(null);
  const [proof, setProof] = useState<VerificationProofPayload | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);

  const refreshDomain = useMemo(
    () => async () => {
      if (!requirementId || domainType === null) return;
      setDomainLoading(true);
      setDomainError(null);
      try {
        const res = await fetch(`/api/domain/${encodeURIComponent(requirementId)}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as DomainResponse;
        if (!res.ok || json.ok !== true) {
          setDomainError(json.error ?? `HTTP ${res.status}`);
        } else {
          setDomainState(json);
        }
      } catch (raw) {
        setDomainError(raw instanceof Error ? raw.message : String(raw));
      } finally {
        setDomainLoading(false);
      }
    },
    [requirementId, domainType],
  );

  const handleDomainAction = useCallback(
    async (action: DomainLifecycleAction) => {
      if (!requirementId) return;
      setDomainBusy(action.key);
      setDomainResult(null);
      try {
        const endpoint = `/api/capabilities/${encodeURIComponent(action.capability)}/${encodeURIComponent(action.commandName)}`;
        const body = action.buildInput(requirementId);
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await resp.json().catch(() => ({}))) as {
          ok?: boolean;
          output?: unknown;
          error?: string;
          record?: { invokedAt?: string; commandKey?: string };
        };
        if (!resp.ok || json.ok !== true) {
          setDomainResult({
            at: Date.now(),
            ok: false,
            message: json.error ?? `HTTP ${resp.status}`,
          });
          return;
        }
        const invokedAt = json.record?.invokedAt ?? new Date().toISOString();
        const commandKey = json.record?.commandKey;
        setDomainResult({
          at: Date.now(),
          ok: true,
          message: `${action.label} berhasil via ${commandKey ?? endpoint} pada ${invokedAt}. Output: ${JSON.stringify(json.output).slice(0, 120)}`,
        });
        await refreshDomain();
      } catch (err) {
        setDomainResult({
          at: Date.now(),
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setDomainBusy(null);
      }
    },
    [requirementId, refreshDomain],
  );

  useEffect(() => {
    if (domainType !== null) {
      void refreshDomain();
    }
  }, [domainType, refreshDomain]);

  const refresh = useMemo(
    () => async () => {
      if (!requirementId || domainType !== null) {
        setLoading(false);
        setPayload(null);
        setVerification(null);
        setProof(null);
        setChainError(null);
        return;
      }

      setLoading(true);
      setError(null);
      setChainError(null);
      setVerification(null);
      setProof(null);
      try {
        const deliveryPayload = await readDelivery(requirementId);
        setPayload(deliveryPayload);

        const [verificationResult, proofResult] = await Promise.allSettled([
          readRequirementRuntime<VerificationDecisionPayload>(
            `/api/requirements/${encodeURIComponent(requirementId)}/verification`,
          ),
          readRequirementRuntime<VerificationProofPayload>(
            `/api/requirements/${encodeURIComponent(requirementId)}/proof`,
          ),
        ]);
        if (verificationResult.status === "fulfilled") setVerification(verificationResult.value);
        if (proofResult.status === "fulfilled") setProof(proofResult.value);
      } catch (raw) {
        setError(raw instanceof Error ? raw.message : String(raw));
      } finally {
        setLoading(false);
      }
    },
    [requirementId, domainType],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const lifecycle = useMemo(() => {
    if (!domainState?.rawStatus || !domainType) return null;
    switch (domainType) {
      case "lawyershub.case": return caseLifecycle(domainState.rawStatus);
      case "services-id.request": return serviceLifecycle(domainState.rawStatus);
      case "ilc.article": return articleLifecycle(domainState.rawStatus);
      case "ilc.discussion": return discussionLifecycle(domainState.rawStatus);
      default: return null;
    }
  }, [domainState?.rawStatus, domainType]);

  const actions = useMemo(() => {
    if (!domainState?.rawStatus || !domainType) return [];
    switch (domainType) {
      case "lawyershub.case": return caseActions(domainState.rawStatus);
      case "services-id.request": return serviceRequestActions(domainState.rawStatus);
      case "ilc.article": return articleActions(domainState.rawStatus);
      case "ilc.discussion": return [];
      default: return [];
    }
  }, [domainState?.rawStatus, domainType]);

  if (loading && !payload) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-100 rounded-xl w-1/3"></div>
          <div className="h-4 bg-slate-100 rounded-xl w-2/3"></div>
          <div className="h-32 bg-slate-100 rounded-xl w-full"></div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Ruang Kerja {displayName ?? productId}
            </h1>
            <p className="mt-2 text-slate-600">
              {copy?.workspaceDescription ?? "Pantau progres penyelesaian pekerjaan beserta seluruh catatan bukti pendukung secara lengkap."}
            </p>
          </div>
        </div>

        {/* Domain Lifecycle Visualization */}
        {domainLoading ? (
          <div className="mt-8 animate-pulse">
            <div className="h-6 bg-slate-100 rounded w-full"></div>
          </div>
        ) : domainError ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-red-800">Gagal memuat status domain: {domainError}</p>
          </div>
        ) : lifecycle && domainState ? (
          <div className="mt-8">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 mb-4">Progres</h3>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {lifecycle.map((step, idx) => (
                <React.Fragment key={step.key}>
                  <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${lifecycleStepTone(step)}`}>
                    {step.label}
                  </div>
                  {idx < lifecycle.length - 1 && <div className="h-px w-4 bg-slate-300"></div>}
                </React.Fragment>
              ))}
            </div>

            {/* Available Actions */}
            {actions.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {actions.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => handleDomainAction(action)}
                    disabled={domainBusy === action.key}
                    className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${actionTone(action.tone)}`}
                  >
                    {domainBusy === action.key ? "Memproses..." : action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Action Result */}
            {domainResult && (
              <div className={`mt-4 rounded-xl p-3 ${domainResult.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                {domainResult.message}
              </div>
            )}
          </div>
        ) : null}
      </section>

      {/* Delivery Payload Details (if requirement-based) */}
      {payload && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Status Penyelesaian: {payload.requirement.id}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</div>
              <p className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${statusTone(payload.requirement.status)}`}>
                {payload.requirement.status}
              </p>
            </div>
            {payload.delivery && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Catatan Bukti Pendukung</div>
                <p className="mt-2 text-slate-900">{payload.delivery.traceability.evidenceArtifactCount} dokumen</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Verification Status */}
      {verification && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Status Verifikasi</h2>
          <span className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold border ${verification.verdict === "passed" ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-amber-100 text-amber-800 border-amber-300"}`}>
            {verification.verdict === "passed" ? "✓ TERVERIFIKASI" : "⚠ MENUNGGU VERIFIKASI"}
          </span>
        </section>
      )}
    </div>
  );
}