"use client";

import React, { useState } from 'react';
import type { WorkParticipant, WorkRealityPerspective } from '@repo/presentation-entities';

const perspectiveLabels: Record<WorkRealityPerspective, string> = {
  customer: "PIHAK TERLIBAT",
  professional: "TIM",
  operator: "PEOPLE",
  agent: "STAKEHOLDERS",
  notary: "NOTARIES"
};

const roleOptions: Array<{ value: WorkParticipant['role']; label: string; description: string }> = [
  { value: 'customer', label: '👤 Klien', description: 'Penerima outcome / pemilik kebutuhan' },
  { value: 'professional', label: '⚖️ Profesional', description: 'Lawyer, Notary, Processor, Senior Processor' },
  { value: 'operator', label: '🎛️ Operator', description: 'Platform / workspace administrator' },
  { value: 'agent', label: '🤖 Agent', description: 'EOS Agent / sistem otomatis' },
  { value: 'notary', label: '📜 Notaris', description: 'Notaris / pejabat umum' }
];

export interface RealityPeopleProps {
  participants: WorkParticipant[];
  currentPerspective: WorkRealityPerspective;
  workId?: string;
  onAddParticipant?: (name: string, role: WorkParticipant['role']) => Promise<void>;
}

const roleLabelMap: Record<WorkParticipant['role'], string> = {
  customer: 'Klien',
  professional: 'Profesional',
  operator: 'Operator',
  agent: 'Agent',
  notary: 'Notaris'
};

export function RealityPeople({ participants, currentPerspective, workId, onAddParticipant }: RealityPeopleProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<WorkParticipant['role']>('professional');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const canAdd = (currentPerspective === 'operator' || currentPerspective === 'professional' || currentPerspective === 'agent' || currentPerspective === 'notary') && onAddParticipant && workId;

  const visibleParticipants = currentPerspective === 'operator' || currentPerspective === 'agent' || currentPerspective === 'notary'
    ? participants
    : participants.filter(p => p.role === currentPerspective || p.role === 'agent');

  const handleAdd = async () => {
    if (!workId || !newName.trim() || !onAddParticipant) return;
    setSending(true);
    setError(null);
    try {
      await onAddParticipant(newName, newRole);
      setNewName('');
      setNewRole('professional');
      setShowAdd(false);
    } catch (e) {
      setError('Gagal menambahkan partisipan');
    } finally {
      setSending(false);
    }
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {perspectiveLabels[currentPerspective]}
        </h2>
        {canAdd && workId && (
          <button
            onClick={() => setShowAdd(v => !v)}
            className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
          >
            {showAdd ? 'Batal' : '+ Tambah Partisipan'}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {visibleParticipants.length > 0 ? visibleParticipants.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
            {p.role === 'professional' && <span>⚖️</span>}
            {p.role === 'customer' && <span>👤</span>}
            {p.role === 'operator' && <span>🎛️</span>}
            {p.role === 'agent' && <span>🤖</span>}
            <span className="font-medium">{p.name}</span>
            <span className="text-[10px] text-slate-400">· {roleLabelMap[p.role]}</span>
          </span>
        )) : (
          <span className="text-slate-500">Belum ada partisipan tercatat</span>
        )}
      </div>

      {showAdd && workId && (
        <div className="mt-4 space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="space-y-2">
            <label className="text-xs font-medium text-indigo-900">Nama partisipan</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Contoh: Lawyer Budi Santoso"
              className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm focus:border-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-950/20"
              disabled={sending}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-indigo-900">Peran / Posisi terhadap Work ini</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {roleOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setNewRole(opt.value)}
                  disabled={sending}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                    newRole === opt.value
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-indigo-200 bg-white text-slate-700 hover:bg-indigo-100'
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className={`text-[11px] ${newRole === opt.value ? 'text-slate-300' : 'text-slate-500'}`}>
                    {opt.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              Tambahkan
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewName(''); setNewRole('professional'); }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Batal
            </button>
          </div>
          <p className="text-[11px] text-indigo-700">
            Partisipan ditambahkan sebagai komunikasi terikat Work ini dan muncul di semua view lainnya.
          </p>
        </div>
      )}
    </section>
  );
}