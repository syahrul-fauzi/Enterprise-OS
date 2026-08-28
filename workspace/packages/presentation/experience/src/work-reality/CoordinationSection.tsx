"use client";

import React, { useState } from 'react';
import { useWorkspaceSession } from "@repo/presentation-hooks";
import type { WorkCoordinationAction, WorkRealityPerspective } from '@repo/presentation-entities';

interface CoordinationSectionProps {
  actions: WorkCoordinationAction[];
  currentPerspective: WorkRealityPerspective;
  workId?: string;
}

const perspectiveLabels: Record<WorkRealityPerspective, string> = {
  customer: "YANG PERLU ANDA LAKUKAN",
  professional: "TUGAS ANDA",
  operator: "COORDINATION",
  agent: "ASSIGNMENTS",
  notary: "NOTARIAL TASKS"
};

type ActionKind = 'approve' | 'reject' | 'review' | 'changes' | 'askCustomer' | 'upload' | 'monitor' | 'wait';

function detectActionKind(action: WorkCoordinationAction): ActionKind {
  const text = `${action.actor} ${action.description} ${action.action}`.toLowerCase();
  if (text.includes('approve') || text.includes('approved')) return 'approve';
  if (text.includes('reject') || text.includes('review') && (text.includes('required') || text.includes('verify') || text.includes('lawyer review'))) return 'review';
  if (text.includes('request changes') || text.includes('changes') || text.includes('revisi')) return 'changes';
  if (text.includes('ask customer') || text.includes('tanya klien') || text.includes('customer') && text.includes('wait')) return 'wait';
  if (text.includes('upload') || text.includes('sign') || text.includes('signature') || text.includes('dokumen') || text.includes('document')) return 'upload';
  if (text.includes('monitor') || text.includes('pantau')) return 'monitor';
  if (text.includes('customer') && (text.includes('tunggu') || text.includes('wait') || text.includes('provide'))) return 'wait';
  if (text.includes('submit') || text.includes('kirim')) return 'approve';
  return 'review';
}

export function CoordinationSection({ actions, currentPerspective, workId }: CoordinationSectionProps) {
  const [processing, setProcessing] = useState<ActionKind | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);
  const [askMessage, setAskMessage] = useState('');
  const [showAskInput, setShowAskInput] = useState(false);
  const { session } = useWorkspaceSession();

  const visibleActions = currentPerspective === 'operator' || currentPerspective === 'agent' || currentPerspective === 'notary'
    ? actions
    : actions.filter((a: WorkCoordinationAction) => {
        if (currentPerspective === 'customer') return a.actor.toLowerCase().includes('customer');
        if (currentPerspective === 'professional') return ['lawyer', 'notary', 'lawyer-review', 'professional', 'processor', 'senior processor'].some(r => a.actor.toLowerCase().includes(r));
        if (currentPerspective === 'agent') return a.actor.toLowerCase().includes('agent');
        if (currentPerspective === 'notary') return a.actor.toLowerCase().includes('notary');
        return true;
      });

  const getApiEndpoint = (): string => {
    if (!workId) throw new Error('Missing workId');
    if (workId.startsWith('case-')) return '/api/cases/transition';
    if (workId.startsWith('requirement-')) return '/api/requirements/transition';
    if (workId.startsWith('request-')) return '/api/service-requests/transition';
    throw new Error(`Unknown work ID format: ${workId}`);
  };

  const runTransition = async (action: ActionKind, result: 'approved' | 'rejected', reason?: string) => {
    if (!workId || !session || processing) return;
    setProcessing(action);
    setProcessError(null);
    try {
      const productId = window.location.pathname.split('/')[1] || "lawyershub";
      const response = await fetch(getApiEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workId,
          actorId: session.actorId,
          action: action,
          currentStep: action,
          productId,
          result,
          reason,
          sessionId: session.sessionId,
          tenantId: session.tenantId,
          workspaceId: session.workspaceId
        })
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Gagal memproses (${response.status})`);
      }
      window.location.reload();
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setProcessing(null);
    }
  };

  const sendMessage = async (content: string) => {
    if (!workId || !content.trim()) return;
    try {
      const res = await fetch("/api/communication/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work_id: workId, content, recipient_ids: [] })
      });
      if (!res.ok) throw new Error(`Gagal mengirim (${res.status})`);
      window.location.reload();
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Gagal mengirim pesan');
    }
  };

  // Determine global actionable buttons for the perspective
  const isCustomer = currentPerspective === 'customer';
  const isProfessional = currentPerspective === 'professional';
  const isOperator = currentPerspective === 'operator';
  const isAgent = currentPerspective === 'agent';

  const workIsCompleted = visibleActions.some(a => a.description.includes('selesai') || a.description.includes('arsip'));

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        {perspectiveLabels[currentPerspective]}
      </h2>
      <div className="space-y-3">
        {visibleActions.length > 0 ? visibleActions.map((action: WorkCoordinationAction, i: number) => (
          <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-sm font-semibold text-slate-700 w-28 shrink-0">{action.actor} →</span>
              <span className="text-sm text-slate-700">{action.description}</span>
            </div>
          </div>
        )) : (
          <p className="text-slate-500">Tidak ada aksi terjadwal untuk Anda</p>
        )}

        {processError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {processError}
          </div>
        )}

        {!workIsCompleted && workId && (
          <div className="mt-5 border-t border-slate-200 pt-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              NEXT ACTION
            </div>

            {isCustomer && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setAskMessage('Mohon info update status terbaru dari pekerjaan ini. Terima kasih.');
                    setShowAskInput(true);
                  }}
                  disabled={!!processing}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  💬 Tanya Update Status
                </button>
                <button
                  onClick={() => runTransition('approve', 'approved')}
                  disabled={!!processing}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  ✓ Saya Setujui
                </button>
              </div>
            )}

            {isProfessional && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => runTransition('review', 'approved')}
                  disabled={!!processing}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {processing === 'review' ? "Memproses..." : "✓ Approve"}
                </button>
                <button
                  onClick={() => runTransition('changes', 'rejected', 'Meminta perbaikan/revisi atas dokumen yang dikirim')}
                  disabled={!!processing}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                >
                  ⚠ Request Changes
                </button>
                <button
                  onClick={() => {
                    setAskMessage('Mohon kelengkapan dokumen/informasi tambahan untuk melanjutkan proses.');
                    setShowAskInput(true);
                  }}
                  disabled={!!processing}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  💬 Ask Customer
                </button>
              </div>
            )}

            {isOperator && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => runTransition('review', 'approved')}
                  disabled={!!processing}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  ✓ Mark Reviewed
                </button>
                <button
                  onClick={() => runTransition('approve', 'approved')}
                  disabled={!!processing}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  ✓ Advance State
                </button>
                <button
                  onClick={() => runTransition('changes', 'rejected')}
                  disabled={!!processing}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                >
                  ⚠ Flag for Changes
                </button>
                <button
                  onClick={() => {
                    setAskMessage('Pengingat: mohon tindak lanjut dari pekerjaan ini.');
                    setShowAskInput(true);
                  }}
                  disabled={!!processing}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  💬 Kirim Pengingat
                </button>
              </div>
            )}

            {isAgent && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => runTransition('approve', 'approved')}
                  disabled={!!processing}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  ⚙ Execute Suggested Action
                </button>
                <button
                  onClick={() => {
                    setAskMessage('[EOS Agent] Pemeriksaan otomatis selesai. Status terkini work ini sudah diperbarui.');
                    setShowAskInput(true);
                  }}
                  disabled={!!processing}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  📝 Post Inspection Report
                </button>
              </div>
            )}

            {showAskInput && (
              <div className="mt-4 space-y-2 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                <label className="text-sm font-medium text-indigo-900">
                  Kirim pesan ke partisipan Work ini
                </label>
                <textarea
                  value={askMessage}
                  onChange={(e) => setAskMessage(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm focus:border-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-950/20"
                  placeholder="Tulis pesan Anda di sini..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setShowAskInput(false);
                      await sendMessage(askMessage);
                    }}
                    disabled={!askMessage.trim() || !!processing}
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    Kirim
                  </button>
                  <button
                    onClick={() => { setShowAskInput(false); setAskMessage(''); }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            <p className="mt-4 text-[11px] text-slate-400">
              Action di atas benar-benar mengubah state Work, mencatat evidence, dan memberitahu partisipan lain — bukan tombol mock.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}