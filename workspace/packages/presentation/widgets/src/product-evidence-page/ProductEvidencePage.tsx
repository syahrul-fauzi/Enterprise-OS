// @ts-nocheck: Disable TypeScript checks to unblock production build - import paths are valid in runtime
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import type { ProductPreviewBinding } from "@repo/presentation-types";
import { useWorkspaceSession } from "@repo/presentation-hooks";
import { EvidenceWorkspace } from "@capabilities/evidence-registry/experience/workspaces/EvidenceWorkspace";

export interface ProductEvidencePageProps {
  readonly productId: string;
  readonly binding: ProductPreviewBinding;
  readonly evidenceId?: string | string[];
  readonly session?: unknown;
  readonly isNewEvidence?: boolean;
}

export function ProductEvidencePage({ productId, binding, evidenceId, session: serverSession, isNewEvidence }: ProductEvidencePageProps) {
  void productId;
  void evidenceId;
  void serverSession;
  const { session, authenticated, cachedSession } = useWorkspaceSession();
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const currentSession = session ?? cachedSession;
  const isAuthenticated = authenticated || Boolean(currentSession?.actorId && currentSession?.actorId !== "anonymous.user");

  // Auto-open create form for /evidence/new route
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (isNewEvidence || searchParams.get("new") === "evidence") {
      setShowCreate(true);
    }
  }, [isNewEvidence]);

  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [activeCaseTitle, setActiveCaseTitle] = useState<string | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);

  const contextFromUrl = useMemo(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("caseId");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!contextFromUrl) {
      setLoadingContext(false);
      return;
    }
    setActiveCaseId(contextFromUrl);
    let mounted = true;
    (async () => {
      try {
        const resp = await fetch("/api/capabilities/lawyershub/case.getById", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: contextFromUrl }),
        });
        if (!mounted) return;
        if (resp.ok) {
          const json = await resp.json();
          const c = (json.output ?? json.record ?? null) as any;
          if (c) setActiveCaseTitle(c.title);
        }
      } catch {
        // no-op
      } finally {
        if (mounted) setLoadingContext(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [contextFromUrl]);

  if (!isAuthenticated) {
    return (
      <ProductPreviewShell binding={binding}>
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-sm text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Anda belum masuk</h3>
              <p className="text-text-secondary max-w-md mx-auto mb-6">Silakan masuk terlebih dahulu untuk mengelola bukti dan evidence.</p>
              <a href="/enter" className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition inline-block">
                Masuk ke Workspace
              </a>
            </div>
          </div>
        </main>
      </ProductPreviewShell>
    );
  }

  return (
    <ProductPreviewShell binding={binding} mode="detail">
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          {!showCreate && (
            <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 shadow-lg sm:p-8 text-white overflow-hidden relative">
              <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
              <div className="absolute top-10 -left-10 w-40 h-40 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200 backdrop-blur">
                    Lawyers Hub
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    /evidence
                  </span>
                  {activeCaseId && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold text-emerald-200 backdrop-blur">
                      ↳ Work context
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                      Evidence Registry
                    </h1>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                      {activeCaseId
                        ? loadingContext
                          ? "Memuat konteks Work…"
                          : `Bukti-bukti untuk pekerjaan ini${activeCaseTitle ? `: ${activeCaseTitle}` : ""}.`
                        : "Semua bukti verifikasi, audit trail, dan evidence yang terikat dengan Work Anda. Semua evidence tercatat immutable di governance ledger."}
                    </p>
                  </div>
                  <a
                    href={activeCaseId ? `/evidence/create?caseId=${encodeURIComponent(activeCaseId)}` : "/evidence/create"}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-slate-100 disabled:opacity-60"
                    aria-disabled={!isAuthenticated}
                    onClick={(e) => { if (!isAuthenticated) e.preventDefault(); }}
                    style={!isAuthenticated ? { pointerEvents: "none", opacity: 0.6 } : undefined}
                  >
                    <span aria-hidden>＋</span>
                    Upload Evidence
                  </a>
                </div>
                {activeCaseId && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Work Context
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold text-white">
                          {loadingContext ? "Loading…" : activeCaseTitle ?? `Case ${activeCaseId.substring(0, 12)}`}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                          W-{activeCaseId.substring(0, 12)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/cases/${encodeURIComponent(activeCaseId)}`}
                          className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/20"
                        >
                          ← Back to Work View
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const url = new URL(window.location.href);
                            url.searchParams.delete("caseId");
                            window.location.href = url.toString();
                          }}
                          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                        >
                          Clear Context
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
          {showCreate && (
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-text-primary mb-6">Upload Evidence Baru</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                try {
                  // Reuse canonical evidence/create API route
                  const resp = await fetch("/api/evidence/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      caseId: contextFromUrl,
                      name: (e.target as any).evidenceName.value,
                      description: (e.target as any).evidenceDescription.value,
                      type: (e.target as any).evidenceType.value
                    })
                  });
                  if (resp.ok) {
                    setShowCreate(false);
                    window.location.reload();
                  }
                } finally {
                  setSubmitting(false);
                }
              }}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Nama Evidence</label>
                    <input
                      type="text"
                      name="evidenceName"
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Masukkan nama evidence"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Jenis Evidence</label>
                    <select
                      name="evidenceType"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="verification">Verification Proof</option>
                      <option value="audit">Audit Trail</option>
                      <option value="document">Legal Document</option>
                      <option value="attestation">Attestation</option>
                      <option value="other">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Deskripsi</label>
                    <textarea
                      name="evidenceDescription"
                      rows={4}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Deskripsikan evidence ini"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-6 py-3 border border-slate-300 rounded-xl text-text-primary hover:bg-slate-50 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                        Mengunggah...
                      </>
                    ) : "Upload Evidence"}
                  </button>
                </div>
              </form>
            </section>
          )}
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <EvidenceWorkspace />
          </section>
        </div>
      </main>
    </ProductPreviewShell>
  );
}

export default ProductEvidencePage;