"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import { DocumentWorkspace } from "@capabilities/legal-document/experience/workspaces/DocumentWorkspace";
import type { ProductPreviewBinding } from "@repo/presentation-types";
import { useWorkspaceSession } from "@repo/presentation-hooks";
import type { CaseAggregate } from "@capabilities/legal-case/implementation/contracts/case.contracts";

export interface ProductDocumentsPageProps {
  readonly productId: string;
  readonly binding: ProductPreviewBinding;
  readonly documentId?: string | string[];
}

export function ProductDocumentsPage({ productId, binding, documentId }: ProductDocumentsPageProps) {
  void productId;
  void documentId;
  const { session, authenticated, cachedSession } = useWorkspaceSession();
  const currentSession = session ?? cachedSession;
  const isAuthenticated = authenticated || Boolean(currentSession?.actorId && currentSession?.actorId !== "anonymous.user");

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
          const c: CaseAggregate | null = (json.output ?? json.record ?? null) as CaseAggregate | null;
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

  return (
    <>
      <ProductPreviewShell binding={binding} mode="detail" />
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-6 shadow-lg sm:p-8 text-white overflow-hidden relative">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />
            <div className="absolute top-10 -left-10 w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200 backdrop-blur">
                  Lawyers Hub
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  /documents
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
                    Documents
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                    {activeCaseId
                      ? loadingContext
                        ? "Memuat konteks Work…"
                        : `Dokumen-dokumen untuk pekerjaan ini${activeCaseTitle ? `: ${activeCaseTitle}` : ""}.`
                      : "Semua dokumen legal Anda. Buat, review, dan tandatangani dokumen yang terikat dengan Work Anda."}
                  </p>
                </div>
                <a
                  href={activeCaseId ? `/documents/create?caseId=${encodeURIComponent(activeCaseId)}` : "/documents/create"}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-slate-100 disabled:opacity-60"
                  aria-disabled={!isAuthenticated}
                  onClick={(e) => { if (!isAuthenticated) e.preventDefault(); }}
                  style={!isAuthenticated ? { pointerEvents: "none", opacity: 0.6 } : undefined}
                >
                  <span aria-hidden>＋</span>
                  Create Document
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

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <DocumentWorkspace />
          </section>
        </div>
      </main>
    </>
  );
}

export default ProductDocumentsPage;
