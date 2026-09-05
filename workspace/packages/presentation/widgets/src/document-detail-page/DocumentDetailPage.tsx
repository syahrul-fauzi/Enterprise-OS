"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import { useWorkspaceSession } from "@repo/presentation-hooks";
import type { ProductPreviewBinding } from "@repo/presentation-experience";
// DocumentAggregate/Status types imported from canonical legal document contracts - @ts-nocheck removed (MINIMAL FIX: architecture lock compliance)
import type { DocumentAggregate, DocumentStatus } from "@capabilities/legal-document/implementation/contracts/document.contracts";

const LAWYERSHUB_DOC_WORKFLOW = {
  steps: [
    { id: "draft" as const, label: "Draft" },
    { id: "review" as const, label: "Review" },
    { id: "sign" as const, label: "Sign" },
    { id: "archive" as const, label: "Archive" },
  ],
};

export interface DocumentDetailPageProps {
  readonly productId: string;
  readonly documentId: string;
  readonly binding: ProductPreviewBinding;
}

type DocStepState = "done" | "current" | "pending";

interface DocCapabilityStep {
  readonly id: string;
  readonly label: string;
  readonly state: DocStepState;
}

interface DocArtifactCounts {
  readonly versions: number;
  readonly signatures: number;
  readonly relatedCases: number;
}

interface DocActivityEntry {
  readonly id: string;
  readonly at: Date;
  readonly text: string;
}

const DOC_STATUS_LABEL: Record<DocumentStatus, string> = {
  draft: "Draft",
  review: "In Review",
  signed: "Signed",
  archived: "Archived",
};

const DOC_STATUS_DOT: Record<DocumentStatus, string> = {
  draft: "bg-slate-400",
  review: "bg-amber-500",
  signed: "bg-emerald-500",
  archived: "bg-slate-700",
};

function fmtDocAt(d: Date): string {
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
  if (sameDay) return `Today ${hh}:${mm}`;
  if (isYesterday) return `Yesterday ${hh}:${mm}`;
  return `${at.toLocaleDateString()} ${hh}:${mm}`;
}

function deriveDocSteps(d: DocumentAggregate | null): readonly DocCapabilityStep[] {
  const rawStates = LAWYERSHUB_DOC_WORKFLOW.steps.map((s): DocStepState => {
    if (!d) return s.id === "draft" ? "current" : "pending";
    switch (d.status) {
      case "draft":
        return s.id === "draft" ? "current" : "pending";
      case "review":
        if (s.id === "draft") return "done";
        if (s.id === "review") return "current";
        return "pending";
      case "signed":
        if (s.id === "draft" || s.id === "review" || s.id === "sign") return "done";
        return "pending";
      case "archived":
        return "done";
      default:
        return "pending";
    }
  });
  return LAWYERSHUB_DOC_WORKFLOW.steps.map((s, idx): DocCapabilityStep => {
    return { id: s.id, label: s.label, state: rawStates[idx] ?? "pending" };
  });
}

function deriveDocArtifacts(d: DocumentAggregate | null, relatedCaseCount: number): DocArtifactCounts {
  const signatures = d?.signedAt ? 1 : 0;
  return {
    versions: 1,
    signatures,
    relatedCases: relatedCaseCount,
  };
}

function deriveDocActivity(doc: DocumentAggregate | null): readonly DocActivityEntry[] {
  const entries: DocActivityEntry[] = [];
  if (doc) {
    entries.push({
      id: `doc-created-${doc.id}`,
      at: new Date(doc.createdAt),
      text: "Document created",
    });
    if (doc.updatedAt.getTime() !== doc.createdAt.getTime()) {
      entries.push({
        id: `doc-updated-${doc.id}`,
        at: new Date(doc.updatedAt),
        text: "Document revised",
      });
    }
    if (doc.status === "review") {
      entries.push({
        id: `doc-review-${doc.id}`,
        at: new Date(doc.updatedAt),
        text: `Review requested${doc.author ? ` by ${doc.author}` : ""}`,
      });
    }
    if (doc.status === "signed" && doc.signedAt) {
      entries.push({
        id: `doc-signed-${doc.id}`,
        at: new Date(doc.signedAt),
        text: `Document signed${doc.author ? ` by ${doc.author}` : ""}`,
      });
    }
    if (doc.status === "archived" && doc.archivedAt) {
      entries.push({
        id: `doc-archived-${doc.id}`,
        at: new Date(doc.archivedAt),
        text: "Document archived",
      });
    }
  }
  return entries
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 5);
}

export function DocumentDetailPage({ productId, documentId, binding }: DocumentDetailPageProps) {
  void productId;
  const { session, authenticated } = useWorkspaceSession();
  const [doc, setDoc] = useState<DocumentAggregate | null>(null);
  const [relatedCasesCount, setRelatedCasesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const docResp = await fetch("/api/capabilities/lawyershub/document.getById", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: documentId }),
      });
      let docAggregate: DocumentAggregate | null = null;
      if (docResp.ok) {
        const docJson = await docResp.json();
        docAggregate = (docJson.output ?? docJson.record ?? null) as DocumentAggregate | null;
      }
      setDoc(docAggregate);

      const matterId = docAggregate?.matterId;
      const workId = docAggregate?.workId;

      let casesCount = 0;
      if (matterId || workId) {
        try {
          const casesResp = await fetch("/api/capabilities/lawyershub/case.search", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ limit: 10, offset: 0 }),
          });
          if (casesResp.ok) {
            const casesJson = await casesResp.json();
            const items = (casesJson.output?.items ?? casesJson.items ?? []) as readonly { id: string; workId?: string }[];
            casesCount = items.filter((c) =>
              (matterId && c.id === matterId) ||
              (workId && c.workId === workId)
            ).length || (items.length > 0 ? 1 : 0);
          }
        } catch {
          casesCount = 0;
        }
      }
      setRelatedCasesCount(casesCount);
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : String(raw));
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const steps = useMemo(() => deriveDocSteps(doc), [doc]);
  const artifacts = useMemo(
    () => deriveDocArtifacts(doc, relatedCasesCount),
    [doc, relatedCasesCount],
  );
  const activity = useMemo(() => deriveDocActivity(doc), [doc]);

  const workIdLabel = doc?.workId ?? documentId.substring(0, 12);
  const actorLabel = session?.actorLabel ?? "You";
  const people = [
    { label: "You", role: actorLabel, highlight: true },
    { label: "Author", role: doc?.author ?? "—", highlight: false },
    { label: "Reviewer", role: "Document Reviewer", highlight: false },
    { label: "Signer", role: authenticated ? "Authorized Signer" : "—", highlight: false },
  ];

  return (
    <>
      <ProductPreviewShell binding={binding} mode="detail" />
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              <div className="font-semibold">Attention needed</div>
              <p className="mt-1">{error}</p>
              <button
                onClick={() => void loadAll()}
                className="mt-3 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Retry loading
              </button>
            </div>
          ) : null}

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="space-y-3">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                ARTIFACT
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                    {loading ? "Loading Document…" : doc ? doc.title : "Document not found"}
                  </h1>
                  <div className="font-mono text-xs tracking-wide text-slate-500">
                    D-{workIdLabel}
                  </div>
                </div>
                {doc ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${DOC_STATUS_DOT[doc.status]}`}
                    />
                    <span className="text-xs font-semibold text-slate-900">
                      {DOC_STATUS_LABEL[doc.status]}
                    </span>
                  </div>
                ) : null}
              </div>
              {doc?.description ? (
                <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  {doc.description}
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              People
            </div>
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
                    {p.label}
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
              Capabilities
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
              Artifacts
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                <div className="text-2xl font-bold text-slate-950">{artifacts.versions}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Versions
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                <div className="text-2xl font-bold text-slate-950">{artifacts.signatures}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Signatures
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                <div className="text-2xl font-bold text-slate-950">{artifacts.relatedCases}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Cases
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Activity
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                latest {activity.length}
              </div>
            </div>
            <ol className="mt-4 space-y-4">
              {loading ? (
                <li className="text-sm opacity-60">Loading activity…</li>
              ) : activity.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-center text-sm text-slate-500">
                  No activity yet — document has just been created.
                </li>
              ) : (
                activity.map((e) => (
                  <li key={e.id} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-slate-900">{e.text}</div>
                      <div className="mt-0.5 text-[11px] font-mono uppercase tracking-wide text-slate-400">
                        {fmtDocAt(e.at)}
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
                  Continue Work
                </div>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">
                  Pick up where you left off. The next action for this Document is ready.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/documents"
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  All Documents →
                </a>
                <a
                  href="/cases"
                  className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Back to Cases
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default DocumentDetailPage;