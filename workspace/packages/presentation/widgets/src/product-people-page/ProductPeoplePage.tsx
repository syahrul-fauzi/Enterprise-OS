"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import type { ProductPreviewBinding } from "@repo/presentation-experience";
import { useWorkspaceSession } from "@repo/presentation-hooks";

export interface ProductPeoplePageProps {
  readonly productId: string;
  readonly binding: ProductPreviewBinding;
  readonly personId?: string | string[];
  readonly session?: unknown;
  readonly isNewPerson?: boolean;
}

export function ProductPeoplePage({ productId, binding, personId, session: serverSession, isNewPerson }: ProductPeoplePageProps) {
  void productId;
  void personId;
  void serverSession;
  const { session, authenticated, cachedSession } = useWorkspaceSession();
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const currentSession = session ?? cachedSession;
  const isAuthenticated = authenticated || Boolean(currentSession?.actorId && currentSession?.actorId !== "anonymous.user");

  // Auto-open invite form for /people/new route
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (isNewPerson || searchParams.get("new") === "person") {
      setShowCreate(true);
    }
  }, [isNewPerson]);

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

  // Dummy people list while PeopleWorkspace is disabled
  const dummyPeople = [
    {
      id: "p-1",
      name: "Sarah Wijaya",
      role: "Lead Lawyer",
      location: "Jakarta",
      activeWorks: 12,
      completedWorks: 43,
      institution: "ABC Law Firm"
    },
    {
      id: "p-2",
      name: "Andi Pratama",
      role: "Notary Public",
      location: "Bandung",
      activeWorks: 8,
      completedWorks: 27,
      institution: "Notaris Jakarta Selatan"
    },
    {
      id: "p-3",
      name: "Rina Sutanto",
      role: "Corporate Secretary",
      location: "Surabaya",
      activeWorks: 5,
      completedWorks: 19,
      institution: "IndoLegal Partners"
    }
  ];

  if (!isAuthenticated) {
    return (
      <ProductPreviewShell binding={binding}>
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-sm text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Anda belum masuk</h3>
              <p className="text-text-secondary max-w-md mx-auto mb-6">Silakan masuk terlebih dahulu untuk mengelola kolaborator dan mitra profesional Anda.</p>
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
            <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 p-6 shadow-lg sm:p-8 text-white overflow-hidden relative">
              <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
              <div className="absolute top-10 -left-10 w-40 h-40 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200 backdrop-blur">
                    Lawyers Hub
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    /people
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
                      People Directory
                    </h1>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                      {activeCaseId
                        ? loadingContext
                          ? "Memuat konteks Work…"
                          : `Kolaborator untuk pekerjaan ini${activeCaseTitle ? `: ${activeCaseTitle}` : ""}.`
                          : "Semua profesional, penyedia layanan, dan mitra yang terdaftar di platform. Kelola tim dan kolaborasi Anda dalam satu direktori terpusat."}
                    </p>
                  </div>
                  <a
                    href={activeCaseId ? `/people/create?caseId=${encodeURIComponent(activeCaseId)}` : "/people/create"}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-slate-100 disabled:opacity-60"
                    aria-disabled={!isAuthenticated}
                    onClick={(e) => { if (!isAuthenticated) e.preventDefault(); }}
                    style={!isAuthenticated ? { pointerEvents: "none", opacity: 0.6 } : undefined}
                  >
                    <span aria-hidden>＋</span>
                    Invite Person
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
          {!showCreate && (
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-text-primary">Daftar Profesional</h3>
                  <span className="text-sm text-text-secondary">{dummyPeople.length} kolaborator terdaftar</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {dummyPeople.map((person) => (
                    <div key={person.id} className="rounded-2xl border border-slate-200 p-5 hover:shadow-md transition cursor-pointer">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {person.name.split(" ").map(n => n[0]).join("").substring(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-text-primary truncate">{person.name}</h4>
                          <p className="text-sm text-text-secondary truncate">{person.role}</p>
                          <p className="text-xs text-text-muted mt-1">{person.location} • {person.institution}</p>
                          <div className="flex gap-3 mt-3 text-xs">
                            <span className="text-emerald-600">{person.activeWorks} aktif</span>
                            <span className="text-slate-500">{person.completedWorks} selesai</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
          {showCreate && (
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-text-primary mb-6">Undang Kolaborator Baru</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                try {
                  // Reuse canonical people/invite API route
                  const resp = await fetch("/api/people/invite", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      caseId: contextFromUrl,
                      name: (e.target as any).personName.value,
                      email: (e.target as any).personEmail.value,
                      role: (e.target as any).personRole.value,
                      institution: (e.target as any).personInstitution.value
                    })
                  });
                  if (resp.ok) {
                    setShowCreate(false);
                  }
                } catch {
                  // no-op
                } finally {
                  setSubmitting(false);
                }
              }}>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="personName" className="block text-sm font-medium text-text-primary mb-2">Nama Lengkap</label>
                    <input
                      type="text"
                      id="personName"
                      name="personName"
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition"
                      placeholder="Sarah Wijaya"
                    />
                  </div>
                  <div>
                    <label htmlFor="personEmail" className="block text-sm font-medium text-text-primary mb-2">Alamat Email</label>
                    <input
                      type="email"
                      id="personEmail"
                      name="personEmail"
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition"
                      placeholder="sarah@abclawfirm.co.id"
                    />
                  </div>
                  <div>
                    <label htmlFor="personRole" className="block text-sm font-medium text-text-primary mb-2">Peran Profesional</label>
                    <input
                      type="text"
                      id="personRole"
                      name="personRole"
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition"
                      placeholder="Lead Lawyer"
                    />
                  </div>
                  <div>
                    <label htmlFor="personInstitution" className="block text-sm font-medium text-text-primary mb-2">Institusi</label>
                    <input
                      type="text"
                      id="personInstitution"
                      name="personInstitution"
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition"
                      placeholder="ABC Law Firm"
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
                  >
                    {submitting ? "Mengirim undangan..." : "Kirim Undangan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-text-primary transition hover:bg-slate-50"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </main>
    </ProductPreviewShell>
  );
}