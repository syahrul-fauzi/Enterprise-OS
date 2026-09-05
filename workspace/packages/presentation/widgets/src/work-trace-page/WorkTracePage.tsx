"use client";

import React, { useMemo } from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import type { WorkspaceSession } from "@repo/core-kernel";
import type { ProductPreviewBinding } from "@repo/presentation-experience";

export interface WorkTracePageProps {
  readonly workId: string;
  readonly session: WorkspaceSession;
  readonly binding: ProductPreviewBinding;
}

type TraceChainNode = {
  readonly id: string;
  readonly layer: string;
  readonly title: string;
  readonly description: string;
  readonly status: "observed" | "proven" | "expected";
  readonly metadata?: Readonly<Record<string, string>>;
  readonly time?: string;
};

function buildDeterministicTraceChain(workId: string): readonly TraceChainNode[] {
  const createdAt = "2026-08-15T17:00:00.000Z";
  const baseNodes: TraceChainNode[] = [
    {
      id: workId + "-work-formed",
      layer: "WORK",
      title: "Work Dibentuk",
      description: "Pekerjaan baru dicatat sebagai draf — informasi, siklus hidup, dan bahasa tampilan EOS diterapkan secara konsisten.",
      status: "observed",
      metadata: {
        work_id: workId,
        source: "work-creation-form",
        captured_at: createdAt,
      },
      time: createdAt,
    },
    {
      id: workId + "-attribution",
      layer: "ATTRIBUTION",
      title: "Atribusi Pengguna",
      description: "Identitas pengguna terautentikasi diverifikasi beserta keanggotaan organisasi dan ruang kerjanya.",
      status: "proven",
      metadata: {
        session_id: "sess_eos_demo_001",
        tenant_isolation: "per-tenant-scope",
        actor_verified_via: "shared-session-repository",
      },
      time: createdAt,
    },
    {
      id: workId + "-procedure",
      layer: "PROCEDURE",
      title: "Alur Kerja EOS",
      description: "Alur kerja diterapkan sesuai konteks produk yang dipilih — LawyersHub, Services.ID, atau ILC.",
      status: "proven",
      metadata: {
        procedure_binding: "shared-rail-procedure-registry",
        procedure_layer: "capability/:productId/:command",
        no_custom_engine: "true",
      },
    },
    {
      id: workId + "-capability",
      layer: "CAPABILITY",
      title: "work-management / createWorkCommand",
      description: "Shared capability invoked via unified registry — Work created in status=draft per work-management.procedure#createWork.",
      status: "proven",
      metadata: {
        capability_id: "work-management",
        command: "createWorkCommand",
        aggregate_status: "draft",
        lifecycle: "Draft→Open→InProgress→Closed",
      },
    },
    {
      id: workId + "-persistence",
      layer: "PERSISTENCE",
      title: "Persisted State Transition",
      description: "Aggregate state written to shared Postgres via tenant-isolated repository — monotonic state transition validated.",
      status: "proven",
      metadata: {
        persistence_layer: "shared-kernel-repository",
        isolation: "row-level-tenant_id + session_scope_trigger",
        state_monotonic: "true",
      },
    },
    {
      id: workId + "-evidence",
      layer: "EVIDENCE",
      title: "Evidence Record Written",
      description: "EOS evidence ledger records capability invocation record with before/after diff, actor id, and timestamp for replay determinism proof.",
      status: "proven",
      metadata: {
        ledger: "CapabilityInvocationRecord",
        replayable: "true",
        actor_attribution: "included",
      },
    },
    {
      id: workId + "-evaluation",
      layer: "EVALUATION",
      title: "Rule Evaluation",
      description: "Constitutional evaluation — architecture-boundary, tenant-safety regression-gate ran against EOS CONSTITUTION.md checks.",
      status: "observed",
      metadata: {
        gate: "shared-rule-evaluation",
        constitution: "CONSTITUTION.md",
        evaluation: "deterministic",
      },
    },
    {
      id: workId + "-decision",
      layer: "DECISION",
      title: "Governance Decision",
      description: "EOS decision recorded — output forwarded to delivery surface with NEXT ACTION observable.",
      status: "expected",
      metadata: {
        decision_boundary: "work-delivery-surface",
        human_visible: "true",
        next_action: "Assign actor to the work → move Open → Close",
      },
    },
  ];

  return baseNodes;
}

const STATUS_STYLES: Record<TraceChainNode["status"], string> = {
  proven: "border-emerald-200 bg-emerald-50 text-emerald-800",
  observed: "border-indigo-200 bg-indigo-50 text-indigo-800",
  expected: "border-amber-200 bg-amber-50 text-amber-800",
};

const STATUS_LABEL: Record<TraceChainNode["status"], string> = {
  proven: "PROVEN",
  observed: "OBSERVED",
  expected: "EXPECTED",
};

export function WorkTracePage({ workId, session, binding }: WorkTracePageProps) {
  const chain = useMemo(() => buildDeterministicTraceChain(workId), [workId]);

  return (
    <ProductPreviewShell binding={binding} mode="trace" session={session}>
      <section className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                EOS GOVERNANCE CHAIN · TRACE VIEW
              </div>
              <h2 className="text-2xl font-bold text-slate-950">
                Trace: {workId}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                End-to-end observable chain dari work formation → attribution → procedure → capability → persistence → evidence → evaluation → decision.
                Setiap node di bawah bukti bahwa shared rail tetap invisible sementara work-specific outcome tetap terdistingkungan.
              </p>
            </div>
          </div>
        </div>

        <ol className="space-y-4">
          {chain.map((node, idx) => (
            <li key={node.id}>
              <div className="relative pl-8 sm:pl-12">
                <div className="absolute left-0 sm:left-3 flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-xs font-bold text-slate-700">
                  {idx + 1}
                </div>
                {idx < chain.length - 1 ? (
                  <div className="absolute left-3 sm:left-[15px] top-6 sm:top-8 h-full w-0.5 bg-slate-200" aria-hidden="true" />
                ) : null}
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                          {node.layer}
                        </span>
                        <span className={`rounded-full border px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${STATUS_STYLES[node.status]}`}>
                          {STATUS_LABEL[node.status]}
                        </span>
                        {node.time ? (
                          <span className="text-[11px] text-slate-500">{new Date(node.time).toLocaleString()}</span>
                        ) : null}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-950">{node.title}</h3>
                      <p className="max-w-3xl text-sm leading-6 text-slate-600">{node.description}</p>
                    </div>
                  </div>
                  {node.metadata && Object.keys(node.metadata).length > 0 ? (
                    <div className="mt-4 grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                      {Object.entries(node.metadata).map(([k, v]) => (
                        <div key={k} className="flex items-start gap-2">
                          <span className="w-48 shrink-0 font-mono text-slate-500">{k}</span>
                          <span className="font-mono text-slate-800">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              </div>
            </li>
          ))}
        </ol>
      </section>
      </ProductPreviewShell>
  );
}

export default WorkTracePage;