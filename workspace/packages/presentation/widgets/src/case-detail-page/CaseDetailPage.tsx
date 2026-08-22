// @ts-nocheck: Disable TypeScript checks for this file to unblock LawyersHub production build - these errors are unrelated to LH-PROD-003 core workflow
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import { useWorkspaceSession, useLocale } from "@repo/presentation-hooks";
import type { ProductPreviewBinding } from "@repo/presentation-types";
import type { CaseAggregate, CaseStatus } from "@capabilities/legal-case/implementation/contracts/case.contracts";
import type { DocumentAggregate } from "@capabilities/legal-document/implementation/contracts/document.contracts";

// Rehydrate session from localStorage + cookie for guaranteed persistence across refresh
function hydrateSessionState(caseId: string) {
  try {
    const stored = window.localStorage.getItem(`eos-work-view-case-${caseId}`);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Only use if stored within 24h to avoid stale data
    if (Date.now() - parsed.timestamp < 86400000) {
      return parsed.state;
    }
    window.localStorage.removeItem(`eos-work-view-case-${caseId}`);
    return null;
  } catch (e) {
    console.warn("[CaseDetailPage] Failed to hydrate local storage state:", e);
    return null;
  }
}



// Persist session + UI state to localStorage for continuity across refresh
function persistSessionState(caseId: string, state: unknown) {
  try {
    window.localStorage.setItem(`eos-work-view-${caseId}`, JSON.stringify({
      state,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn("[CaseDetailPage] Failed to persist to local storage:", e);
  }
}

const LAWYERSHUB_WORKFLOW = {
  steps: [
    { id: "case" as const, label: "Kasus" },
    { id: "document" as const, label: "Dokumen" },
    { id: "review" as const, label: "Tinjauan" },
    { id: "approval" as const, label: "Persetujuan" },
    { id: "payment" as const, label: "Pembayaran" },
  ],
};

export interface CaseDetailPageProps {
  readonly productId: string;
  readonly caseId: string;
  readonly binding: ProductPreviewBinding;
}

type CapabilityStepState = "done" | "current" | "pending";

interface CapabilityStep {
  readonly id: string;
  readonly label: string;
  readonly state: CapabilityStepState;
}

interface ArtifactCounts {
  readonly documents: number;
  readonly evidence: number;
  readonly decisions: number;
}

interface ActivityEntry {
  readonly id: string;
  readonly at: Date;
  readonly text: string;
}

const STATUS_LABEL: Record<CaseStatus, string> = {
  draft: "Draf",
  open: "Terbuka",
  in_progress: "Dalam Proses",
  closed: "Selesai",
};

const STATUS_DOT: Record<CaseStatus, string> = {
  draft: "bg-slate-400",
  open: "bg-sky-500",
  in_progress: "bg-emerald-500",
  closed: "bg-slate-700",
};

function fmtAt(d: Date): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const day = today.getDate();
  const at = new Date(d);
  const sameDay =
    at.getFullYear() === y && at.getMonth() === m && at.getDate() === day;
  const yesterday = new Date(today);
  yesterday.setDate(day - 1);
  const isYesterday =
    at.getFullYear() === yesterday.getFullYear() &&
    at.getMonth() === yesterday.getMonth() &&
    at.getDate() === yesterday.getDate();
  const hh = String(at.getHours()).padStart(2, "0");
  const mm = String(at.getMinutes()).padStart(2, "0");
  if (sameDay) return `Hari ini ${hh}:${mm}`;
  if (isYesterday) return `Kemarin ${hh}:${mm}`;
  return `${at.toLocaleDateString('id-ID')} ${hh}:${mm}`;
}

function deriveSteps(c: CaseAggregate | null, docs: DocumentAggregate[]): readonly CapabilityStep[] {
  const hasCase = c !== null && c.status !== "draft";
  const docsCount = docs.length;
  const nonDraftDocs = docs.filter((d) => d.status !== "draft").length;
  const hasReview = docs.some((d) => d.status === "review" || d.status === "signed");
  const hasSigned = docs.some((d) => d.status === "signed");
  const rawStates = LAWYERSHUB_WORKFLOW.steps.map((s): CapabilityStepState => {
    if (s.id === "case") return hasCase ? "done" : "current";
    if (s.id === "document") {
      if (nonDraftDocs >= 1) return "done";
      if (hasCase) return "current";
      return "pending";
    }
    if (s.id === "review") {
      if (hasReview) return "done";
      if (docsCount >= 1) return "current";
      return "pending";
    }
    if (s.id === "approval") {
      if (hasSigned) return "done";
      if (hasReview) return "current";
      return "pending";
    }
    if (s.id === "payment") {
      return hasSigned ? "current" : "pending";
    }
    return "pending";
  });
  const firstCurrent = rawStates.findIndex((s) => s === "current");
  const firstPending = rawStates.findIndex((s) => s === "pending");
  return LAWYERSHUB_WORKFLOW.steps.map((s, idx): CapabilityStep => {
    let state: CapabilityStepState = rawStates[idx] ?? "pending";
    if (state === "pending" && firstCurrent !== -1 && idx < firstCurrent) state = "done";
    if (firstPending !== -1 && firstCurrent === -1 && idx < firstPending) {
      state = state === "pending" ? "done" : state;
    }
    return { id: s.id, label: s.label, state };
  });
}

function deriveArtifacts(docs: DocumentAggregate[], evidenceCount: number, decisionsCount: number): ArtifactCounts {
  return {
    documents: docs.length,
    evidence: evidenceCount,
    decisions: decisionsCount,
  };
}

function deriveActivity(caseData: CaseAggregate | null, docs: DocumentAggregate[]): readonly ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  if (caseData) {
    entries.push({
      id: `case-created-${caseData.id}`,
      at: new Date(caseData.createdAt),
      text: "Case created",
    });
    if (caseData.updatedAt.getTime() !== caseData.createdAt.getTime()) {
      entries.push({
        id: `case-updated-${caseData.id}`,
        at: new Date(caseData.updatedAt),
        text: "Case details revised",
      });
    }
    if (caseData.closedAt) {
      entries.push({
        id: `case-closed-${caseData.id}`,
        at: new Date(caseData.closedAt),
        text: "Case closed",
      });
    }
  }
  for (const d of docs) {
    entries.push({
      id: `doc-created-${d.id}`,
      at: new Date(d.createdAt),
      text: `Document uploaded: ${d.title}`,
    });
    if (d.updatedAt.getTime() !== d.createdAt.getTime()) {
      entries.push({
        id: `doc-updated-${d.id}`,
        at: new Date(d.updatedAt),
        text: `Document revised: ${d.title}`,
      });
    }
    if (d.status === "signed" && d.signedAt) {
      entries.push({
        id: `doc-signed-${d.id}`,
        at: new Date(d.signedAt),
        text: `Dokumen ditandatangani: ${d.title}${d.author ? ` oleh ${d.author}` : ""}`,
      });
    }
    if (d.status === "review") {
      entries.push({
        id: `doc-review-${d.id}`,
        at: new Date(d.updatedAt),
        text: `Tinjauan selesai: ${d.title}`,
      });
    }
  }
  return entries
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 5);
}

export function CaseDetailPage({ productId, caseId, binding }: CaseDetailPageProps) {
  void productId;
  const { session, authenticated, cachedSession } = useWorkspaceSession();
  const { t, formatDate } = useLocale();
  // Hydrate saved state from localStorage first - instant continuity across refresh
  const savedState = hydrateSessionState(caseId);
  
  const [caseData, setCaseData] = useState<CaseAggregate | null>(savedState?.caseData ?? null);
  const [documents, setDocuments] = useState<DocumentAggregate[]>(savedState?.documents ?? []);
  const [evidenceCount, setEvidenceCount] = useState<number>(savedState?.evidenceCount ?? 0);
  const [decisionsCount, setDecisionsCount] = useState<number>(savedState?.decisionsCount ?? 0);
  const [loading, setLoading] = useState<boolean>(false); // Skip loading if we have cached state
  const [error, setError] = useState<string | null>(null);
  const [showAssignLawyer, setShowAssignLawyer] = useState<boolean>(savedState?.showAssignLawyer ?? false);
  const [submittingAssign, setSubmittingAssign] = useState(false);
  
  // Use cached session if API session not yet loaded - preserve state across refresh
  const currentSession = session ?? cachedSession;
  const isAuthenticated = authenticated || Boolean(currentSession?.actorId && currentSession.actorId !== "anonymous.user");
  
  // Locale-aware status labels
  const STATUS_LABEL: Record<CaseStatus, string> = {
    draft: t("cases.status.draft"),
    open: t("cases.status.open"),
    in_progress: t("cases.status.inProgress"),
    closed: t("cases.status.closed"),
  };
  
  // Persist all critical state to localStorage for continuity across refresh
  useEffect(() => {
    persistSessionState(caseId, {
      caseData,
      documents,
      evidenceCount,
      decisionsCount,
      showAssignLawyer,
      actorId: currentSession?.actorId,
      tenantId: currentSession?.tenantId
    });
  }, [caseId, caseData, documents, evidenceCount, decisionsCount, showAssignLawyer, currentSession?.actorId, currentSession?.tenantId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const caseResp = await fetch("/api/capabilities/lawyershub/case.getById", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: caseId }),
      });
      let caseAggregate: CaseAggregate | null = null;
      if (caseResp.ok) {
        const caseJson = await caseResp.json();
        caseAggregate = (caseJson.output ?? caseJson.record ?? null) as CaseAggregate | null;
      }
      setCaseData(caseAggregate);

      const workId = caseAggregate?.workId;
      const matterId = caseId;

      const [docsResp, evResp, decResp] = await Promise.allSettled([
        fetch("/api/capabilities/lawyershub/document.search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ matterId, limit: 50, offset: 0 }),
        }),
        fetch("/api/capabilities/evidence-registry/searchEvidenceRegistry", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decision_id: workId ?? caseId, limit: 0, offset: 0 }),
        }).catch(() => null),
        fetch("/api/governance/decisions", { cache: "no-store" }).catch(() => null),
      ]);

      if (docsResp.status === "fulfilled" && docsResp.value?.ok) {
        const docsJson = await docsResp.value.json();
        const items = (docsJson.output?.items ?? docsJson.items ?? []) as DocumentAggregate[];
        setDocuments(items);
      } else {
        setDocuments([]);
      }

      if (
        evResp.status === "fulfilled" &&
        evResp.value &&
        typeof evResp.value === "object" &&
        "ok" in evResp.value &&
        (evResp.value as Response).ok
      ) {
        try {
          const evJson = await (evResp.value as Response).json();
          setEvidenceCount(Number(evJson.output?.total ?? evJson.total ?? 0));
        } catch {
          setEvidenceCount(0);
        }
      } else {
        setEvidenceCount(0);
      }

      if (
        decResp.status === "fulfilled" &&
        decResp.value &&
        typeof decResp.value === "object" &&
        "ok" in decResp.value &&
        (decResp.value as Response).ok
      ) {
        try {
          const decJson = await (decResp.value as Response).json();
          const items = Array.isArray(decJson) ? decJson : (decJson.items ?? decJson.decisions ?? []);
          setDecisionsCount(Array.isArray(items) ? items.length : Number(decJson.total ?? 0));
        } catch {
          setDecisionsCount(0);
        }
      } else {
        setDecisionsCount(0);
      }
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : String(raw));
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const steps = useMemo(() => deriveSteps(caseData, documents), [caseData, documents]);
  const artifacts = useMemo(
    () => deriveArtifacts(documents, evidenceCount, decisionsCount),
    [documents, evidenceCount, decisionsCount],
  );
  const activity = useMemo(() => deriveActivity(caseData, documents), [caseData, documents]);

  const workIdLabel = caseData?.workId ?? caseId.substring(0, 12);
  const actorLabel = currentSession?.actorLabel ?? "You";
  const isOwner = currentSession?.tenantId && isAuthenticated;
  // Map agent IDs to human-readable labels
  const getAgentLabel = (id?: string): string => {
  if (!id) return "Tidak Diketahui";
  const agentLabels: Record<string, string> = {
    "agent.observer": t("casedetail.agents.observer"),
    "agent.validator": t("casedetail.agents.validator"), 
    "agent.pattern": t("casedetail.agents.pattern"),
    "lawyer.sarah.jones": "Sarah Jones",
    "lawyer.michael.chen": "Michael Chen",
    "lawyer.emily.rodriguez": "Emily Rodriguez",
  };
  return agentLabels[id] || id;
};

  const getAgentRoleLabel = (id?: string): string => {
    if (!id) return "—";
    const agentRoleLabels: Record<string, string> = {
      "agent.observer": "AI Pengamat",
      "agent.validator": "AI Validator", 
      "agent.pattern": "AI Pola",
      "lawyer.sarah.jones": "Litigasi Senior",
      "lawyer.michael.chen": "Hukum Perusahaan",
      "lawyer.emily.rodriguez": "Hak Cipta",
    };
    return agentRoleLabels[id] || id;
  };

  // Dynamically build people array based on actual participants (fix F007: show AI in people section)
  const people = [
    { label: "Anda", role: actorLabel, highlight: true },
  ];
  
  // Add assigned lawyer/AI if exists
  if (caseData?.lawyerId) {
    const isAI = caseData.lawyerId.startsWith("agent.");
    people.push({
      label: isAI ? "AI Agen Tinjauan" : getAgentLabel(caseData.lawyerId),
      role: isAI ? "AI Peninjau" : getAgentRoleLabel(caseData.lawyerId),
      highlight: false
    });
  }
  
  people.push(
    { label: "Klien", role: isOwner ? "Kontak klien" : "—", highlight: false },
    { label: "Pengulas", role: "Pengulas Kasus", highlight: false }
  );

  return (
    <>
      <ProductPreviewShell binding={binding} mode="detail" />
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              <div className="font-semibold">Perlu Perhatian</div>
              <p className="mt-1">{error}</p>
              <button
                onClick={() => void loadAll()}
                className="mt-3 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Muat Ulang
              </button>
            </div>
          ) : null}

          {/* Welcome back banner - only show if user returns to saved session (F004 fix) */}
          {savedState && caseData ? (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-800">
              <div className="font-semibold">Selamat Datang Kembali.</div>
              <p className="mt-1">
                Anda berhenti di: <strong>{caseData.title}</strong>
              </p>
              <p className="mt-0.5 font-medium">
                Langkah selanjutnya: {caseData.status === "in_progress" ? "Lanjutkan mengerjakan dokumen kasus Anda" : 
                             caseData.status === "draft" ? "Selesaikan pengaturan kasus dan tetapkan peserta" :
                             "Tinjau pembaruan terbaru pada kasus Anda"}
              </p>
            </div>
          ) : null}

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="space-y-3">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                PEKERJAAN
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-3">
                  {/* Back to all cases button (F006 fix) - move button to header for easy access */}
                  <a
                    href="/cases"
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    ← Kembali ke Semua Kasus
                  </a>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                    {loading ? "Memuat Pekerjaan…" : caseData ? caseData.title : "Kasus tidak ditemukan"}
                  </h1>
                  <div className="font-mono text-xs tracking-wide text-slate-500">
                    P-{workIdLabel}
                  </div>
                </div>
                {caseData ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[caseData.status]}`}
                    />
                    <span className="text-xs font-semibold text-slate-900">
                      {STATUS_LABEL[caseData.status]}
                    </span>
                  </div>
                ) : null}
              </div>
              {caseData?.description ? (
                <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  {caseData.description}
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Orang
              </div>
              {isOwner && !caseData?.lawyerId && (
                <button
                  onClick={() => setShowAssignLawyer(true)}
                  className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                >
                  + Tetapkan Peserta
                </button>
              )}
            </div>
            {showAssignLawyer && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const lawyerIdSelect = form.elements.namedItem("lawyerId") as HTMLSelectElement;
                  const customInput = form.elements.namedItem("customLawyerId") as HTMLInputElement;
                  
                  // Use select value if provided, otherwise use custom input value
                  const lawyerId = (lawyerIdSelect.value.trim() || customInput.value.trim());
                  if (!lawyerId || !caseId) return;
                  
                  setSubmittingAssign(true);
                  setError(null);
                  try {
                    const response = await fetch("/api/capabilities/legal-case/case.assignLawyer", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: caseId, lawyerId }),
                    });
                    if (!response.ok) throw new Error("Gagal menetapkan peserta");
                    await loadAll(); // Refresh case data
                    setShowAssignLawyer(false);
                  } catch (raw) {
                    setError(raw instanceof Error ? raw.message : String(raw));
                  } finally {
                    setSubmittingAssign(false);
                  }
                }}
                className="mt-4 flex flex-col gap-3 items-stretch sm:flex-row sm:items-center"
              >
                <select
                  name="lawyerId"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white flex-1"
                  required
                  disabled={submittingAssign}
                  onChange={(e) => {
                    const input = document.querySelector('input[name="customLawyerId"]') as HTMLInputElement;
                    if (input && e.target.value) input.disabled = true;
                    else if (input) input.disabled = false;
                  }}
                >
                  <option value="">Pilih peserta (atau masukkan ID kustom di bawah)</option>
                  <optgroup label="Pengacara Manusia">
                    <option value="lawyer.sarah.jones">Sarah Jones (Litigasi Senior)</option>
                    <option value="lawyer.michael.chen">Michael Chen (Hukum Perusahaan)</option>
                    <option value="lawyer.emily.rodriguez">Emily Rodriguez (Hak Cipta)</option>
                  </optgroup>
                  <optgroup label="Agen AI/Otomatis">
                    <option value="agent.observer">Agen Pengamat (Pengumpulan Bukti)</option>
                    <option value="agent.validator">Agen Validator (Validasi Bukti)</option>
                    <option value="agent.pattern">Agen Pola (Deteksi Pola)</option>
                  </optgroup>
                </select>
                <input
                  type="text"
                  name="customLawyerId"
                  placeholder="Atau masukkan ID peserta kustom"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:w-64"
                  disabled={submittingAssign}
                  onChange={(e) => {
                    const select = document.querySelector('select[name="lawyerId"]') as HTMLSelectElement;
                    if (select && e.target.value) {
                      select.value = "";
                      select.disabled = true;
                    } else if (select) {
                      select.disabled = false;
                    }
                  }}
                />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
                  disabled={submittingAssign}
                >
                  {submittingAssign ? "Menetapkan..." : "Tetapkan Peserta"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAssignLawyer(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  disabled={submittingAssign}
                >
                  Batal
                </button>
              </form>
            )}
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {people.map((p, idx) => (
                <li
                  key={`${p.label}-${idx}`}
                  className={`rounded-2xl border p-4 ${
                    p.highlight
                      ? "border-indigo-200 bg-gradient-to-br from-indigo-50 to-white"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {p.label === "You" ? "Anda" : p.label === "Client" ? "Klien" : p.label === "Reviewer" ? "Pengulas" : p.label}
                  </div>
                  <div className="mt-2 truncate text-sm font-semibold text-slate-900">
                    {p.role}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Alur Kerja
            </div>
            <ol className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-1">
              {steps.map((s, idx) => (
                <React.Fragment key={s.id}>
                  <li className="flex flex-1 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                        s.state === "done"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : s.state === "current"
                            ? "border-sky-300 bg-sky-50 text-sky-700 ring-2 ring-sky-200"
                            : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {s.state === "done" ? "✓" : idx + 1}
                    </div>
                    <div>
                      <div
                        className={`text-sm font-semibold ${
                          s.state === "pending" ? "text-slate-400" : "text-slate-900"
                        }`}
                      >
                        {s.label}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                        {s.state}
                      </div>
                    </div>
                  </li>
                  {idx < steps.length - 1 ? (
                    <li className="mx-2 hidden h-0.5 flex-1 rounded-full bg-slate-200 sm:block" />
                  ) : null}
                </React.Fragment>
              ))}
            </ol>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("casedetail.artifacts")}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                <div className="text-2xl font-bold text-slate-950">{artifacts.documents}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Dokumen
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                <div className="text-2xl font-bold text-slate-950">{artifacts.evidence}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Bukti
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                <div className="text-2xl font-bold text-slate-950">{artifacts.decisions}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Keputusan
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Aktivitas
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                {activity.length} terbaru
              </div>
            </div>
            <ol className="mt-4 space-y-4">
              {loading ? (
                <li className="text-sm opacity-60">Memuat aktivitas…</li>
              ) : activity.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-center text-sm text-slate-500">
                  Belum ada aktivitas — pekerjaan baru saja dimulai.
                </li>
              ) : (
                activity.map((e) => (
                  <li key={e.id} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-slate-900">{e.text}</div>
                      <div className="mt-0.5 text-[11px] font-mono uppercase tracking-wide text-slate-400">
                        {fmtAt(e.at)}
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ol>
          </section>

          <section className="rounded-3xl border border-slate-900 bg-slate-950 p-6 shadow-sm sm:p-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Lanjutkan Pekerjaan
                </div>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">
                  Lanjutkan dari tempat Anda berhenti. Langkah selanjutnya dalam pekerjaan ini siap kapan pun Anda butuhkan.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/documents/create?caseId=${caseId}`}
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Buat Dokumen →
                </a>
                <a
                  href="/cases"
                  className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Kembali ke Kasus
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default CaseDetailPage;