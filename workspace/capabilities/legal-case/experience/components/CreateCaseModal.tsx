"use client";

import React, { useState, useEffect } from "react";
import type { CasePriority } from "../../contracts/case.contracts.js";

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    priority: CasePriority;
    linkedIntentId: string;
    sourceDiscussionId?: string;
    lawyerId?: string;
    sessionId: string;
  }) => Promise<void>;
  sessionId: string;
}

const priorityOptions: readonly CasePriority[] = [
  "low",
  "medium",
  "high",
  "critical",
];

// Intent options sesuai High-Value Work Graph EOS
const intentOptions = [
  { value: "intent-pendirian-pt", label: "Pendirian PT (Perseroan Terbatas)" },
  { value: "intent-merger-review", label: "Review Merger & Akuisisi" },
  { value: "intent-contract-dispute", label: "Sengketa Kontrak" },
  { value: "intent-ip-protection", label: "Perlindungan Hak Cipta/Merek" },
  { value: "intent-litigation", label: "Proses Litigasi Perdata" },
];

export function CreateCaseModal({ isOpen, onClose, onSubmit, sessionId }: CreateCaseModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<CasePriority>("medium");
  const [linkedIntentId, setLinkedIntentId] = useState("");
  const [sourceDiscussionId, setSourceDiscussionId] = useState("");
  const [lawyerId, setLawyerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [localIsOpen, setLocalIsOpen] = useState(isOpen);

  // Listen for create event from workspace (F001 fix: CTA utama di hero section)
  useEffect(() => {
    const handleCreate = () => setLocalIsOpen(true);
    window.addEventListener('cases:create', handleCreate);
    return () => window.removeEventListener('cases:create', handleCreate);
  }, []);

  // Sync with parent isOpen prop
  useEffect(() => {
    setLocalIsOpen(isOpen);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !linkedIntentId || !sessionId) return;
    
    setLoading(true);
    try {
      await onSubmit({
        title,
        description,
        priority,
        linkedIntentId,
        sourceDiscussionId: sourceDiscussionId.trim() || undefined,
        lawyerId: lawyerId.trim() || undefined,
        sessionId
      });
      // Reset form
      setTitle("");
      setDescription("");
      setPriority("medium");
      setLinkedIntentId("");
      setSourceDiscussionId("");
      setLawyerId("");
      onClose();
      // Trigger refresh to show new case (CORE-001 compliant)
      window.dispatchEvent(new CustomEvent('cases:refresh'));
    } catch (err) {
      console.error("[CreateCaseModal] Failed to create case:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!localIsOpen) return null;

  const fmtPriority = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">Buat Kasus Hukum Baru</h3>
          <p className="text-sm text-slate-500 mt-1">Mulai proses legal work Anda dengan memasukkan detail kasus</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Judul Kasus *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Misal: Pendirian PT XYZ Indonesia"
              required
              data-testid="case-title-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Intent Dasar *</label>
            <select
              value={linkedIntentId}
              onChange={(e) => setLinkedIntentId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              data-testid="case-intent-select"
            >
              <option value="">Pilih intent utama kasus</option>
              {intentOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deskripsi Tambahan (Opsional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              placeholder="Detail tambahan jika diperlukan..."
              data-testid="case-description-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prioritas</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as CasePriority)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="case-priority-select"
            >
              {priorityOptions.map((p) => (
                <option key={p} value={p}>{fmtPriority(p)}</option>
              ))}
            </select>
          </div>
          {/* F002 fix: Client company field sebagai field utama (bukan hidden) */}
          <div>
            <label className="block text-sm font-medium mb-1">Nama Klien/Perusahaan *</label>
            <input
              type="text"
              value={sourceDiscussionId}
              onChange={(e) => setSourceDiscussionId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nama perusahaan atau klien yang meminta layanan"
              required
              data-testid="case-client-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ID Advokat yang akan menangani (Opsional)</label>
            <input
              type="text"
              value={lawyerId}
              onChange={(e) => setLawyerId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ID advokat yang akan ditugaskan"
              data-testid="case-lawyer-input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              disabled={loading}
              data-testid="submit-case-button"
            >
              {loading ? "Memproses..." : "Buat Kasus"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}