"use client";

import React, { useEffect, useState } from "react";
import type { RequirementArtifactGraph } from "../../../../../apps/web/lib/artifact-graph.js";

export interface CausalTraceViewProps {
  readonly productId: string;
  readonly requirementId: string;
}

interface TraceRelation {
  readonly from: string;
  readonly to: string;
  readonly relation: "transforms_into" | "depends_on" | "implements" | "verified_by";
  readonly description: string;
}

const RELATION_LABELS: Record<TraceRelation["relation"], { label: string; color: string }> = {
  transforms_into: { label: "Transforms Into", color: "bg-blue-100 text-blue-800" },
  depends_on: { label: "Depends On", color: "bg-amber-100 text-amber-800" },
  implements: { label: "Implements", color: "bg-purple-100 text-purple-800" },
  verified_by: { label: "Verified By", color: "bg-emerald-100 text-emerald-800" },
};

export function CausalTraceView({ productId, requirementId }: CausalTraceViewProps) {
  const [graph, setGraph] = useState<RequirementArtifactGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadArtifactGraph() {
      try {
        const response = await fetch(`/api/requirements/${requirementId}/artifact-graph`, {
          cache: "no-store",
        });
        
        if (!response.ok) {
          throw new Error("Failed to load artifact graph");
        }
        
        const data = await response.json() as RequirementArtifactGraph;
        setGraph(data);
      } catch (raw) {
        setError(raw instanceof Error ? raw.message : String(raw));
      } finally {
        setLoading(false);
      }
    }

    void loadArtifactGraph();
  }, [requirementId]);

  if (loading) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 shadow-sm">
        <div className="text-center text-slate-500">Loading causal trace graph...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <div className="text-red-700">Error loading trace: {error}</div>
      </section>
    );
  }

  if (!graph) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-slate-500">No trace data available</div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total Nodes</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{graph.summary.node_count}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total Edges</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{graph.summary.edge_count}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Code Nodes</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{graph.summary.code_nodes}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Evidence Nodes</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{graph.summary.evidence_nodes}</div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Transformation Trace Timeline</h3>
        <div className="space-y-4">
          {graph.transformationTrace.map((trace, index) => {
            const relationMeta = RELATION_LABELS[trace.relation];
            return (
              <div 
                key={index}
                className="flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50"
              >
                <div className="flex-1 font-mono text-xs text-slate-700 truncate">{trace.from}</div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${relationMeta.color}`}>
                  {relationMeta.label}
                </span>
                <div className="flex-1 font-mono text-xs text-slate-700 truncate">{trace.to}</div>
                <div className="w-full md:w-auto text-xs text-slate-500 md:max-w-xs truncate">{trace.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">All Artifact Nodes</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {graph.nodes.map((node) => (
            <div 
              key={node.id}
              className="rounded-xl border border-slate-200 p-4 bg-white"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border bg-slate-100 text-slate-700">
                  {node.type}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded border bg-emerald-100 text-emerald-700">
                  {node.governance_status}
                </span>
              </div>
              <div className="mt-3 font-medium text-sm text-slate-900 truncate">{node.label}</div>
              <div className="mt-1 font-mono text-[10px] text-slate-500 truncate">{node.id}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CausalTraceView;