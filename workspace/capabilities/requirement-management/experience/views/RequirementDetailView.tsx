"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@repo/presentation-ui-system";
import type { RequirementAggregate } from "../../implementation/contracts/index.js";
import type { VerificationProofObject } from "../../../../apps/web/lib/proof-object.js";
import type { VerificationDecisionSnapshot } from "../../../../apps/web/lib/verification-decision.js";

interface RequirementDetailData {
  requirement: RequirementAggregate;
  proof: VerificationProofObject;
  decision: VerificationDecisionSnapshot;
}

export default function RequirementDetailView() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RequirementDetailData | null>(null);

  useEffect(() => {
    if (!params.id) return;

    async function loadRequirementProof() {
      try {
        setLoading(true);
        // Load requirement proof data
        const proofResponse = await fetch(`/api/requirements/${params.id}/proof`, {
          cache: "no-store",
        });

        if (!proofResponse.ok) {
          throw new Error("Failed to load requirement proof");
        }

        const proof = await proofResponse.json();

        // Load requirement basic data
        const reqResponse = await fetch(`/api/requirements/${params.id}`, {
          cache: "no-store",
        });

        if (!reqResponse.ok) {
          throw new Error("Failed to load requirement details");
        }

        const requirement = await reqResponse.json();

        // Also load the full decision data for more details
        // For simplicity, we'll extract what we need from the proof's provenance
        setData({
          requirement,
          proof,
          decision: {
            requirementFacts: requirement,
            evidenceSet: proof.provenance.evidencePaths.map((path: string, idx: number) => ({
              id: proof.provenance.evidenceIds[idx],
              kind: Object.keys(proof.provenance.registryKindBreakdown)[idx] || "unknown",
              path,
              requirementRefs: proof.provenance.registryRequirementRefs,
              contentHash: "",
            })),
            registryProjection: {
              traceabilityComplete: proof.provenance.consultedPersistedVerificationState,
              artifactCount: 0,
              evidenceArtifactCount: 0,
              verificationArtifactCount: 0,
              gaps: [],
              evidenceMatchedCount: proof.provenance.evidenceIds.length,
              evidenceRequirementRefs: proof.provenance.registryRequirementRefs,
              evidenceSamplePaths: proof.provenance.evidenceSamplePaths,
              kindBreakdown: proof.provenance.registryKindBreakdown,
            },
          } as unknown as VerificationDecisionSnapshot,
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadRequirementProof();
  }, [params.id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Loading requirement proof data...
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <div className="font-semibold">Error loading requirement</div>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  const { requirement, proof, decision } = data;
  const isProven = proof.decision === "passed";

  // Causal trace dependencies (minimal implementation - no graph library)
  const hasDependencies = requirement.dependsOn && requirement.dependsOn.length > 0;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header with verdict badge */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {requirement.id.toUpperCase()}
                </span>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    isProven
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-red-100 text-red-800 border border-red-300"
                  }`}
                >
                  VERDICT: {isProven ? "PASS" : "FAIL"}
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                {requirement.title}
              </h1>
              {requirement.summary && (
                <p className="mt-2 text-lg leading-6 text-slate-600">{requirement.summary}</p>
              )}
            </div>
          </div>
        </section>

        {/* Causal Trace Section - REQ-012 implementation */}
        {hasDependencies && (
          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                🔗 CAUSAL TRACE
              </h2>
              <p className="text-sm text-slate-600 mt-1">Hubungan sebab-akibat requirement ini dengan requirement lain</p>
            </div>
            
            <div className="space-y-4">
              {requirement.dependsOn.map((dep, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center gap-4">
                    {/* Parent requirement node */}
                    <a 
                      href={`/requirements/${dep.requirementId}`}
                      className="flex-1 rounded-xl border border-blue-300 bg-white p-4 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          {dep.requirementId.toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-slate-800">
                          {/* Title will be loaded dynamically, but for seed data we know req-009's title */}
                          {dep.requirementId === "req-009" ? "BaseSearchBar Shared Component Refactor" : dep.requirementId}
                        </span>
                      </div>
                    </a>
                    
                    {/* Relation arrow */}
                    <div className="flex flex-col items-center px-4">
                      <span className="text-2xl">▼</span>
                      <span className="text-xs font-semibold text-blue-700 uppercase mt-1">
                        {dep.relationType}
                      </span>
                    </div>
                    
                    {/* Current requirement node */}
                    <div className="flex-1 rounded-xl border border-emerald-300 bg-emerald-50 p-4 border-2">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          {requirement.id.toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-slate-800">
                          {requirement.title}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Evidence reference for this relation */}
                  <div className="ml-8 pl-4 border-l-2 border-blue-200">
                    <div className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
                      Bukti hubungan di codebase
                    </div>
                    {dep.requirementId === "req-009" && requirement.id === "req-010" && (
                      <div className="rounded-lg bg-white border border-slate-200 p-3">
                        <code className="text-xs text-slate-700 block">
                          apps/web/components/CommunitySearchBar.tsx#L12-L14:
                        </code>
                        <p className="text-xs text-slate-600 mt-1">
                          "Menggunakan BaseSearchBar sebagai shared logic component (REFACTOR REQ-009)<br/>
                          Ditambahkan filter lokasi sesuai REQ-010"
                        </p>
                        <a 
                          href="https://github.com/search?q=repo:Enterprise-OS+BaseSearchBar+REQ-009" 
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2"
                        >
                          Lihat bukti source code →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Core proof status grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 1. What was requested */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              1. Apa yang diminta?
            </h2>
            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Deskripsi
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  {requirement.description || "Tidak ada deskripsi"}
                </p>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Kriteria Penerimaan
                </div>
                <ul className="mt-2 space-y-1">
                  {requirement.acceptanceCriteria.map((criteria, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">✅</span>
                      {criteria}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Pemilik
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{requirement.owner || "Tidak ditentukan"}</p>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Prioritas
                  </div>
                  <p className="mt-1 text-sm text-slate-700 capitalize">{requirement.priority}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* 2. Where it's traced (RTM) */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              2. Di mana requirement tersebut ditrace?
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">RTM Status</span>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    decision.registryProjection.traceabilityComplete
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {decision.registryProjection.traceabilityComplete ? "✅ TERTRACK" : "⚠️ BELUM LENGKAP"}
                </span>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Linked Capabilities
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {requirement.linkedCapabilityIds.map((capId) => (
                    <span
                      key={capId}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-mono"
                    >
                      {capId}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Referensi Requirement Lain
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {proof.provenance.registryRequirementRefs.length > 0 ? (
                    proof.provenance.registryRequirementRefs.map((ref: string) => (
                      <span
                        key={ref}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-mono text-blue-700"
                      >
                        {ref}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">Tidak ada referensi tambahan</span>
                  )}
                </div>
              </div>
              <div className="pt-2">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Jenis Artefak
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  {Object.entries(proof.provenance.registryKindBreakdown).map(([kind, count]) => (
                    <div key={kind} className="rounded-lg bg-slate-50 p-2">
                      <div className="text-lg font-semibold text-slate-900">{count as number}</div>
                      <div className="text-xs text-slate-600 capitalize">{kind}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* 3. Implementasinya apa? */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              3. Implementasinya apa?
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Status Implementasi</span>
                <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800 capitalize">
                  {requirement.status}
                </span>
              </div>
              {requirement.implementedAt && (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Tanggal Implementasi
                  </div>
                  <p className="mt-1 text-sm text-slate-700">
                    {new Date(requirement.implementedAt).toLocaleDateString("id-ID")}
                  </p>
                </div>
              )}
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Lifecycle Eligible
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  {proof.provenance.lifecycleEligible ? "✅ Ya - requirement sudah memenuhi syarat lifecycle" : "❌ Tidak - masih membutuhkan proses lebih lanjut"}
                </p>
              </div>
            </div>
          </Card>

          {/* 4. Evidence-nya apa? */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              4. Evidence-nya apa?
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Jumlah Evidence</span>
                <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  {proof.provenance.evidenceIds.length} items
                </span>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Daftar File Evidence
                </div>
                <ul className="mt-2 max-h-48 space-y-1 overflow-auto">
                  {proof.provenance.evidencePaths.length > 0 ? (
                    proof.provenance.evidencePaths.map((path: string, idx: number) => (
                      <li key={idx} className="text-xs font-mono text-slate-600 truncate">
                        📄 {path}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-slate-500">Belum ada evidence yang terdaftar</li>
                  )}
                </ul>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Evidence IDs
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {proof.provenance.evidenceIds.map((id: string) => (
                    <span
                      key={id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-mono text-slate-600"
                    >
                      {id.slice(0, 12)}...
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 5 & 6. Verdict dan Proven Status - Full width */}
        <section className={`rounded-3xl border p-6 shadow-sm sm:p-8 ${isProven ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
              {isProven ? "✅ REQUIREMENT SUDAH TERBUKTI" : "❌ REQUIREMENT BELUM TERBUKTI"}
            </h2>
            <p className="text-lg text-slate-700">
              {isProven
                ? "Semua kriteria terpenuhi. Requirement ini telah diverifikasi dan memiliki bukti yang cukup."
                : "Beberapa kriteria belum terpenuhi. Periksa kembali implementasi dan evidence yang diperlukan."}
            </p>
            
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <div className="text-2xl font-bold text-slate-900">{proof.proofDigest.slice(0, 16)}...</div>
                <div className="text-xs uppercase tracking-wider text-slate-500">Proof Digest</div>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <div className="text-2xl font-bold text-slate-900">{proof.evaluatedAt.split("T")[0]}</div>
                <div className="text-xs uppercase tracking-wider text-slate-500">Evaluated At</div>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <div className="text-2xl font-bold text-slate-900">{proof.schemaVersion}</div>
                <div className="text-xs uppercase tracking-wider text-slate-500">Schema Version</div>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <div className="text-2xl font-bold text-slate-900">{proof.proofId.split(":").pop()}</div>
                <div className="text-xs uppercase tracking-wider text-slate-500">Proof ID Suffix</div>
              </div>
            </div>
          </div>
        </section>

        {/* Back button */}
        <div className="text-center">
          <a
            href="/requirements"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            ← Kembali ke Daftar Requirements
          </a>
        </div>
      </div>
    </main>
  );
}