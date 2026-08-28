"use client";

import React, { useState } from 'react';
import type { CommunicationEvent, WorkRealityPerspective } from '@repo/presentation-entities';

const perspectiveLabels: Record<WorkRealityPerspective, string> = {
  customer: "PERCAKAPAN",
  professional: "KOMUNIKASI",
  operator: "COMMUNICATION",
  agent: "MESSAGES",
  notary: "KOMUNIKASI"
};

const perspectivePlaceholder: Record<WorkRealityPerspective, string> = {
  customer: "Tanyakan sesuatu kepada profesional yang menangani pekerjaan Anda...",
  professional: "Kirim pesan ke klien atau rekan tim...",
  operator: "Kirim pesan ke seluruh partisipan work ini...",
  agent: "Kirim notifikasi ke partisipan work ini...",
  notary: "Kirim pesan ke lawyer atau klien yang membutuhkan signature dokumen..."
};

interface CommunicationSectionProps {
  communications: CommunicationEvent[];
  perspective: WorkRealityPerspective;
  workId?: string;
}

function formatTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '';
  }
}

export function CommunicationSection({ communications, perspective, workId }: CommunicationSectionProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const sortedCommunications = [...communications].sort((a, b) => a.timestamp - b.timestamp);
  const visibleCommunications = 
    perspective === 'operator' || perspective === 'agent'
      ? sortedCommunications
      : sortedCommunications.filter(c => 
          c.recipients.includes(perspective) || c.sender === perspective
        );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending || !workId) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/communication/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_id: workId,
          content: message.trim(),
          recipient_ids: []
        })
      });
      if (!res.ok) throw new Error(`Gagal mengirim (${res.status})`);
      setMessage('');
      window.location.reload();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Gagal mengirim pesan');
    } finally {
      setSending(false);
    }
  };

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        {perspectiveLabels[perspective]}
      </h2>
      <div className="space-y-3">
        {visibleCommunications.length > 0 ? visibleCommunications.map((comm) => (
          <div key={comm.id} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
            <span className="rounded bg-slate-200 px-2 py-1 font-mono text-xs uppercase">
              {comm.channel}
            </span>
            <div className="flex-1 space-y-1">
              <p className="text-sm text-slate-700">{comm.content}</p>
              <p className="text-[11px] text-slate-400">
                {comm.sender} · {formatTimestamp(comm.timestamp)}
              </p>
            </div>
          </div>
        )) : (
          <p className="text-slate-500">Belum ada komunikasi tercatat</p>
        )}
      </div>

      {workId && (
        <form onSubmit={handleSendMessage} className="mt-4 space-y-2 border-t border-slate-200 pt-4">
          {sendError && (
            <p className="text-sm text-red-600">{sendError}</p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={perspectivePlaceholder[perspective]}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-950/20"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {sending ? "Mengirim..." : "Kirim"}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Pesan akan terikat langsung ke Work ini dan dapat dilihat oleh semua partisipan yang relevan.
          </p>
        </form>
      )}
    </section>
  );
}