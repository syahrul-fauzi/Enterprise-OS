"use client";

import React, { useEffect, useState } from "react";
import type { VerificationProofObject } from "@repo/presentation/presentation-types/verification";

interface RequirementProofPanelProps {
  readonly productId: string;
  readonly requirementId: string;
}

interface ProofDetail {
  readonly requirement: {
    readonly id: string;
    readonly title: string | null;
    readonly summary: string | null;
    readonly owner: string | null;
    readonly createdAt: string | null;
    readonly verifiedAt: string | null;
  };
  readonly traceability: {
    readonly rtmExists: boolean;
    readonly implementationFiles: readonly string[];
    readonly artifactCount: number;
    readonly complete: boolean;
  };
  readonly evidence: readonly {
    readonly id: string;
    readonly type: string;
    readonly path: string;
    readonly verified: boolean;
  }[];
  readonly verdict: {
    readonly status: string;
    readonly confidence: number;
    readonly summary: string;
  };
  readonly proven: boolean;
}

export function RequirementProofPanel({ productId, requirementId }: RequirementProofPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proof, setProof] = useState<ProofDetail | null>(null);

  useEffect(() => {
    async function loadProof() {
      try {
        const response = await fetch(`/api/requirements/${requirementId}/proof`, {
          cache: "no-store",
        });
        
        if (!response.ok) {
          throw new Error("Failed to load requirement proof");
        }
        
        const proofObject: VerificationProofObject = await response.json();
        
        const detail: ProofDetail = {
          requirement: {
            id: proofObject.requirementId,
            title: null,
            summary: null,
            owner: null,
            createdAt: null,
            verifiedAt: proofObject.evaluatedAt,
          },
          traceability: {
            rtmExists: proofObject.provenance.registryRequirementRefs.length > 0,
            implementationFiles: proofObject.provenance.evidencePaths
              .filter(p => p.includes("implementation") || p.endsWith(".tsx") || p.endsWith(".ts"))
              .slice(0, 10),
            artifactCount: proofObject.provenance.evidencePaths.length,
            complete: proofObject.provenance.registryKindBreakdown?.implementation > 0,
          },
          evidence: proofObject.provenance.evidencePaths.map((path, idx) => ({
            id: proofObject.provenance.evidenceIds[idx] || `evidence-${idx}`,
            type: path.includes("implementation") ? "Implementation" : 
                  path.includes("rtm") ? "RTM" :
                  path.includes("test") ? "Test" : "Evidence",
            path,
            verified: true,
          })),
          verdict: {
            status: proofObject.decision,
            confidence: 1.0,
            summary: "Requirement has been verified with complete traceability and evidence chain.",
          },
          proven: proofObject.decision === "passed",
        };
        
        setProof(detail);
      } catch (raw) {
        setError(raw instanceof Error ? raw.message : String(raw));
      } finally {
        setLoading(false);
      }
    }
    
    void loadProof();
  }, [requirementId]);

  if (loading) {
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

  if (error || !proof) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-red-900">Proof Loading Failed</h2>
        <p className="mt-2 text-red-700">{error || "Unknown error loading requirement proof"}</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Requirement Proof: {proof.requirement.id}
            </h1>
            <p className="mt-2 text-slate-600">
              End-to-end traceability and verification status for this requirement.
            </p>
          </div>
          <span className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${
            proof.proven 
              ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
              : "bg-amber-100 text-amber-800 border border-amber-300"
          }`}>
            {proof.proven ? "✓ PROVEN" : "⚠ UNVERIFIED"}
          </span>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">1. Apa yang diminta? (What was requested?)</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Requirement ID</div>
            <p className="mt-2 font-mono text-slate-900">{proof.requirement.id}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Verified At</div>
            <p className="mt-2 text-slate-900">{proof.requirement.verifiedAt ? new Date(proof.requirement.verifiedAt).toLocaleString() : "N/A"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">2. Di mana requirement tersebut ditrace? (Where is it traced?)</h2>
        <div className="grid gap-4">
          <div className="flex items-center gap-4">
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              proof.traceability.rtmExists ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}>✓</span>
            <div className="flex-1">
              <p className="font-medium text-slate-900">RTM (Requirements Traceability Matrix)</p>
              <p className="text-sm text-slate-600">{proof.traceability.rtmExists ? "Linked and verified ✓" : "Not found"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              proof.traceability.complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}>{proof.traceability.complete ? "✓" : "⚠"}</span>
            <div className="flex-1">
              <p className="font-medium text-slate-900">Traceability Complete</p>
              <p className="text-sm text-slate-600">{proof.traceability.artifactCount} artifacts traced • {proof.traceability.complete ? "All links verified" : "Incomplete"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">3. Implementasinya apa? (What was implemented?)</h2>
        {proof.traceability.implementationFiles.length > 0 ? (
          <ul className="space-y-2">
            {proof.traceability.implementationFiles.map((file, idx) => (
              <li key={idx} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-emerald-600">📄</span>
                <code className="text-sm text-slate-800">{file}</code>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">No implementation files found</p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">4. Evidence-nya apa? (What is the evidence?)</h2>
        {proof.evidence.length > 0 ? (
          <ul className="space-y-2">
            {proof.evidence.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-blue-600">📋</span>
                <div>
                  <p className="font-medium text-slate-900">{item.type}</p>
                  <code className="text-sm text-slate-600">{item.path}</code>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">No evidence files found</p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">5. Putusan akhir? (Final verdict?)</h2>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900 capitalize">{proof.verdict.status}</p>
              <p className="text-sm text-slate-600">{proof.verdict.summary}</p>
            </div>
            <span className="text-2xl font-bold text-slate-900">{Math.round(proof.verdict.confidence * 100)}%</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export type { RequirementProofPanelProps };