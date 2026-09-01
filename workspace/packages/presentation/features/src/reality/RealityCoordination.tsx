"use client";

import React from 'react';
import type { WorkCoordinationAction, WorkRealityPerspective } from '@repo/presentation-entities';

export interface RealityCoordinationProps {
  actions: WorkCoordinationAction[];
  currentPerspective: WorkRealityPerspective;
  workId?: string;
  onExecuteAction?: (actionId: string, formData?: FormData) => Promise<void>;
  onSendMessage?: (content: string) => Promise<void>;
}

const perspectiveLabels: Record<WorkRealityPerspective, string> = {
  customer: "YANG PERLU ANDA LAKUKAN",
  professional: "TUGAS ANDA",
  operator: "COORDINATION",
  agent: "ASSIGNMENTS",
  notary: "NOTARIAL TASKS"
};

export function RealityCoordination({ 
  actions, 
  currentPerspective, 
  workId, 
  onExecuteAction,
  onSendMessage 
}: RealityCoordinationProps) {
  // Hanya filter visible actions berdasarkan perspective (PURE RENDERING)
  // TIDAK ADA state, TIDAK ADA API calls, TIDAK ADA business logic
  // Semua action execution didelegasikan ke Controller via props (sesuai MyReality pattern)
  
  const visibleActions = currentPerspective === 'operator' || currentPerspective === 'agent' || currentPerspective === 'notary'
    ? actions
    : actions.filter((a: WorkCoordinationAction) => {
        if (currentPerspective === 'customer') return a.actor.toLowerCase().includes('customer');
        if (currentPerspective === 'professional') return ['lawyer', 'notary', 'lawyer-review', 'professional', 'processor', 'senior processor'].some(r => a.actor.toLowerCase().includes(r));
        if (currentPerspective === 'agent') return a.actor.toLowerCase().includes('agent');
        if (currentPerspective === 'notary') return a.actor.toLowerCase().includes('notary');
        return true;
      });

  // Determine global actionable buttons for the perspective (HANYA UI RENDERING)
  const isCustomer = currentPerspective === 'customer';
  const isProfessional = currentPerspective === 'professional';
  const isOperator = currentPerspective === 'operator';
  const isAgent = currentPerspective === 'agent';

  const workIsCompleted = visibleActions.some(a => a.description.includes('selesai') || a.description.includes('arsip'));

  // State untuk UI sementara hanya untuk input pesan (tanpa logic bisnis)
  const [showAskInput, setShowAskInput] = React.useState(false);
  const [askMessage, setAskMessage] = React.useState('');

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
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                >
                  💬 Tanya Update Status
                </button>
                <button
                  onClick={() => onExecuteAction?.('approve')}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  ✓ Saya Setujui
                </button>
              </div>
            )}

            {isProfessional && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onExecuteAction?.('review')}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => onExecuteAction?.('changes')}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
                >
                  ⚠ Request Changes
                </button>
                <button
                  onClick={() => {
                    setAskMessage('Mohon kelengkapan dokumen/informasi tambahan untuk melanjutkan proses.');
                    setShowAskInput(true);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                >
                  💬 Ask Customer
                </button>
              </div>
            )}

            {isOperator && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onExecuteAction?.('review')}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  ✓ Mark Reviewed
                </button>
                <button
                  onClick={() => onExecuteAction?.('approve')}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  ✓ Advance State
                </button>
                <button
                  onClick={() => onExecuteAction?.('changes')}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
                >
                  ⚠ Flag for Changes
                </button>
                <button
                  onClick={() => {
                    setAskMessage('Pengingat: mohon tindak lanjut dari pekerjaan ini.');
                    setShowAskInput(true);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                >
                  💬 Kirim Pengingat
                </button>
              </div>
            )}

            {isAgent && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onExecuteAction?.('execute-action')}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                >
                  ⚙ Execute Suggested Action
                </button>
                <button
                  onClick={() => {
                    setAskMessage('[EOS Agent] Pemeriksaan otomatis selesai. Status terkini work ini sudah diperbarui.');
                    setShowAskInput(true);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
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
                      await onSendMessage?.(askMessage);
                      setAskMessage('');
                    }}
                    disabled={!askMessage.trim()}
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