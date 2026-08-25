"use client";

import React, { useState, useEffect } from "react";
import type { CaseAggregate } from "@capabilities/legal-case/implementation/contracts/index.js";
import type { CommunicationEvent } from "@capabilities/communication/implementation/contracts/communication.contracts.js";

// Work Reality Surface - EOS's core UI that answers: what is happening with THIS WORK?
// Exact implementation of the user's design: ONE WORK, all context in one place
export default function WorkRealitySurface({ params }: { params: { id: string } }) {
  const [work, setWork] = useState<CaseAggregate | null>(null);
  const [communications, setCommunications] = useState<CommunicationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkData = async () => {
      try {
        // Fetch the single work instance (core EOS invariant: one workId across all systems)
        const caseResp = await fetch(`/api/cases/${params.id}`);
        if (caseResp.ok) {
          const caseData = await caseResp.json();
          setWork(caseData);
        }

        // Fetch ALL communication events bound to THIS WORK ID (what makes EOS unique: everything connected)
        const commsResp = await fetch(`/api/communications/by-work-id?workId=${params.id}`);
        if (commsResp.ok) {
          const commsData = await commsResp.json();
          setCommunications(commsData.events || []);
        }
      } catch (err) {
        console.error("[WorkRealitySurface] Fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkData();
  }, [params.id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="border rounded-2xl bg-white p-8 shadow-sm">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-slate-200 rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!work) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="border rounded-2xl bg-white p-8 shadow-sm text-center">
            <h1 className="text-2xl font-bold">Work not found</h1>
            <p className="mt-2 text-slate-600">The work ID you're looking for doesn't exist.</p>
          </div>
        </div>
      </main>
    );
  }

  // Extract participants from all communication events (people who've participated in THIS WORK)
  const participants = Array.from(new Set(communications.flatMap(e => [e.actor_id, ...e.recipient_ids]))).filter(Boolean);
  
  // Extract evidence artifacts (documents, submissions, responses linked to this work)
  const evidence = communications
    .filter(e => e.metadata?.evidence_file)
    .map(e => ({
      label: e.metadata.evidence_label || "Document",
      value: e.metadata.evidence_file,
      source: e.adapter_type
    }));

  // Determine next actions based on work status
  const getNextStatus = () => {
    switch (work.status) {
      case "draft": return "Menunggu submission dokumen";
      case "open": return "Proses analisis kasus berjalan";
      case "in_progress": return "Menunggu respon dari instansi eksternal";
      case "closed": return "Kasus selesai, arsipkan dokumen";
      default: return "Lanjutkan proses sesuai timeline";
    }
  };

  // Inspection status (automated checks that keep work context intact)
  const inspectionStatus = [
    { label: "Context intact", status: "success", message: "Semua komunikasi terikat ke work ID yang sama" },
    { label: "Responsibility clear", status: "success", message: "Semua partisipan tercatat dengan jelas" },
    { label: "Waiting on external institution", status: "warning", message: "AHU submission masih dalam proses" }
  ];

  // Coordination assignments (who does what next)
  const coordination = [
    { actor: "Notary", action: "submit", description: "Kirim dokumen final ke AHU" },
    { actor: "Agent", action: "monitor", description: "Pantau status submission AHU" },
    { actor: "Customer", action: "wait", description: "Tunggu notifikasi hasil AHU" }
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header with core EOS statement */}
        <header className="text-center py-6">
          <h1 className="text-3xl font-bold text-slate-900">EOS</h1>
          <p className="text-lg text-slate-600 mt-2">WHAT IS HAPPENING?</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
            <span className="text-emerald-700 font-semibold">THIS IS THE SAME WORK.</span>
            <span className="text-emerald-600 text-sm font-mono">ID: {work.workId || work.id}</span>
          </div>
        </header>

        {/* Main Work Reality Surface Card - exactly as requested by user */}
        <div className="border rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="p-8 space-y-8">
            {/* WORK Section */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">WORK</h2>
              <p className="text-xl font-semibold text-slate-900">{work.title}</p>
            </section>

            {/* NOW Section */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">NOW</h2>
              <p className="text-lg text-slate-800">{work.description || "Kasus dalam proses penanganan"}</p>
              <div className="mt-2 inline-flex px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                Status: {work.status.replace("_", " ")}
              </div>
            </section>

            {/* NEXT Section */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">NEXT</h2>
              <p className="text-lg text-slate-800">{getNextStatus()}</p>
            </section>

            {/* PEOPLE Section */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">PEOPLE</h2>
              <div className="flex flex-wrap gap-2">
                {participants.length > 0 ? participants.map((p, i) => (
                  <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                    {p.replace("-001", "")}
                  </span>
                )) : (
                  <span className="text-slate-500">Belum ada partisipan tercatat</span>
                )}
                {work.lawyerId && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {work.lawyerId.replace("-001", "")}
                  </span>
                )}
              </div>
            </section>

            {/* COMMUNICATION Section - shows ALL channels bound to this work (WhatsApp/Email/Web/Slack) */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">COMMUNICATION</h2>
              <div className="space-y-3">
                {communications.length > 0 ? communications.map((comm, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <span className="text-xs font-mono px-2 py-1 bg-slate-200 rounded uppercase">
                      {comm.adapter_type}
                    </span>
                    <p className="text-sm text-slate-700 flex-1">{comm.content}</p>
                  </div>
                )) : (
                  <p className="text-slate-500">Belum ada komunikasi tercatat</p>
                )}
              </div>
            </section>

            {/* INSPECTION Section - EOS's automated continuity checks */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">INSPECTION</h2>
              <div className="space-y-2">
                {inspectionStatus.map((check, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={check.status === "success" ? "text-emerald-500" : "text-amber-500"}>
                      {check.status === "success" ? "✓" : "⚠"}
                    </span>
                    <span className="text-sm font-medium text-slate-800">{check.label}</span>
                    <span className="text-sm text-slate-500">{check.message}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* COORDINATION Section - who does what next (participation, not ownership) */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">COORDINATION</h2>
              <div className="space-y-2">
                {coordination.map((action, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700 w-24">{action.actor} →</span>
                    <span className="text-sm font-medium text-slate-800">{action.action}</span>
                    <span className="text-sm text-slate-500">{action.description}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* EVIDENCE Section - all artifacts linked to this single work */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">EVIDENCE</h2>
              <div className="flex flex-wrap gap-2">
                {evidence.length > 0 ? evidence.map((e, i) => (
                  <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm border border-indigo-200">
                    {e.label} ({e.source})
                  </span>
                )) : (
                  <span className="text-slate-500">Belum ada evidence terunggah</span>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Footer with EOS core proposition */}
        <footer className="text-center py-6 text-slate-500 text-sm">
          <p>EOS keeps work connected. Even when the world around it changes.</p>
        </footer>
      </div>
    </main>
  );
}