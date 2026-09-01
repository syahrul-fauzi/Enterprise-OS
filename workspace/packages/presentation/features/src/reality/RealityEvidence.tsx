"use client";

import React from 'react';
import type { EvidenceArtifact, WorkRealityPerspective } from '@repo/presentation-entities';

// Perspective-specific header labels
const perspectiveLabels: Record<WorkRealityPerspective, string> = {
  customer: "DOKUMEN BUKTI",
  professional: "EVIDENCE CHAIN",
  operator: "EVIDENCE ARCHIVE",
  agent: "PROOF RECORDS",
  notary: "ARSIP NOTARIS"
};

export interface RealityEvidenceProps {
  evidence: EvidenceArtifact[];
  perspective: WorkRealityPerspective;
  caseId?: string; // For uploading new evidence
  onAddEvidence?: (formData: FormData) => Promise<void>;
}

/**
 * EVIDENCE section - menampilkan semua dokumen bukti yang terikat ke Work ini
 * Evidence HANYA muncul sebagai bagian dari Work, tidak menjadi platform sendiri
 * Sesuai thesis: Evidence adalah proof, Work adalah boundary
 * Maintain immutable evidence chain - tidak bisa edit, hanya bisa tambah
 */
export function RealityEvidence({ evidence, perspective, caseId, onAddEvidence }: RealityEvidenceProps) {
  // Sort evidence by creation (maintain chain order - immutable append-only)
  const sortedEvidence = [...evidence];

  // Only allow upload for professional/operator perspectives (lawyers/admins)
  const canUpload = (perspective === 'professional' || perspective === 'operator') && onAddEvidence && caseId;

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        {perspectiveLabels[perspective]}
      </h2>
      <div className="space-y-3">
        {sortedEvidence.length > 0 ? sortedEvidence.map((item, index) => (
          <div key={`${item.url}-${index}`} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
            <span className="text-xs font-mono px-2 py-1 bg-blue-100 text-blue-700 rounded uppercase">
              {item.source.substring(0, 8)}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">{item.label}</p>
              {item.url && (
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                >
                  Lihat dokumen
                </a>
              )}
            </div>
          </div>
        )) : (
          <p className="text-slate-500">Belum ada dokumen bukti yang tercatat</p>
        )}

        {/* Upload button - only show for authorized perspectives */}
        {canUpload && caseId && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Tambah Bukti
              <input 
                type="file" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append('file', file);
                  onAddEvidence?.(formData);
                }}
                accept=".pdf,.doc,.docx,.jpg,.png"
              />
            </label>
          </div>
        )}

        {/* Show outcome if exists (only for customer/professional) - derived from model, never hardcoded */}
        {(perspective === 'customer' || perspective === 'professional') && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">STATUS HASIL</h3>
            {evidence.some(e => e.label === "Case Completed") ? (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-sm font-medium text-emerald-900">✅ Pekerjaan berhasil diselesaikan</p>
                <p className="text-xs text-emerald-700 mt-1">Semua proses telah selesai dan tercatat dalam sistem.</p>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-700">Pekerjaan dalam proses penanganan</p>
                <p className="text-xs text-slate-600 mt-1">Hasil akhir akan ditampilkan setelah pekerjaan selesai</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}