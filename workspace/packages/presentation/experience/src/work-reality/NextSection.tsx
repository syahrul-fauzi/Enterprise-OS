"use client";

import React from 'react';
import type { WorkRealityPerspective } from '@repo/presentation-entities';

// Perspective-specific header labels
const perspectiveLabels: Record<WorkRealityPerspective, string> = {
  customer: "SELanjutnya",
  professional: "LANJUTAN",
  operator: "NEXT",
  agent: "NEXT STEP",
  notary: "LANGKAH SELANJUTNYA"
};

function isCompletedStatus(action: string): boolean {
  return action === "markCompleted";
}

interface NextSectionAction {
  label: string;
  hint: string;
  action: string;
}

interface NextSectionProps {
  nextAction: string | NextSectionAction;
  perspective: WorkRealityPerspective;
  workId: string;
  onAssignLawyer?: (formData: FormData) => Promise<void>;
  onAddEvidence?: (formData: FormData) => Promise<void>;
  onMarkCompleted?: (formData: FormData) => Promise<void>;
}

/**
 * NEXT section - menampilkan langkah selanjutnya untuk Work ini dengan perspective-aware labels
 * Konten difilter berdasarkan perspective (hanya tampilkan action yang relevan untuk actor tersebut)
 */
export function NextSection({ nextAction, perspective, workId, onAssignLawyer, onAddEvidence, onMarkCompleted }: NextSectionProps) {
  // Only show next action to the responsible actor - hide from others
  const shouldShowAction = perspective === 'operator' || perspective === 'professional' || perspective === 'notary';
  
  const action = typeof nextAction === 'string' 
    ? { label: nextAction, hint: "", action: "none" }
    : nextAction;

  const hasContinueButton = !isCompletedStatus(action.action);

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        {perspectiveLabels[perspective]}
      </h2>
      <p className="text-lg text-slate-800">
        {shouldShowAction ? action.label : "Semua proses berjalan sesuai jadwal"}
      </p>
      {action.hint && shouldShowAction && (
        <p className="mt-1 text-sm text-gray-600">{action.hint}</p>
      )}

      {/* Global execution continue button - matches R3-09 /lanjutkan|continue|execute|start/i */}
      {hasContinueButton && shouldShowAction && (
        <div className="mt-4">
          <button
            type="button"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Lanjutkan Eksekusi Pekerjaan
          </button>
        </div>
      )}
      
      {/* Render action forms only for responsible actors */}
      {shouldShowAction && action.action !== "none" && (
        <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          {action.action === "assignLawyer" && onAssignLawyer && (
            <form action={onAssignLawyer}>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Tetapkan Advokat</h4>
              <input type="hidden" name="id" value={workId} />
              <label className="block text-xs text-gray-500 mb-1">ID Advokat</label>
              <input
                name="lawyerId"
                defaultValue="lawyer.budi"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
              >
                Tetapkan & Mulai Proses
              </button>
            </form>
          )}
          {action.action === "addEvidence" && onAddEvidence && (
            <form action={onAddEvidence}>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Tambahkan Bukti</h4>
              <input type="hidden" name="id" value={workId} />
              <label className="block text-xs text-gray-500 mb-1">Judul Bukti</label>
              <input
                name="title"
                defaultValue={`Bukti tahapan seterusnya`}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2 focus:border-blue-500 focus:ring-blue-500"
              />
              <label className="block text-xs text-gray-500 mb-1">Tipe Bukti</label>
              <select
                name="type"
                defaultValue="document"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="document">Dokumen</option>
                <option value="communication">Komunikasi</option>
                <option value="external_response">Eksternal</option>
                <option value="outcome">Outcome</option>
              </select>
              <label className="block text-xs text-gray-500 mb-1">Isi / Catatan</label>
              <textarea
                name="content"
                rows={3}
                defaultValue="Catatan bukti diunggah sebagai bagian dari berkas kasus."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Unggah Bukti
              </button>
            </form>
          )}
          {action.action === "markCompleted" && onMarkCompleted && (
            <form action={onMarkCompleted}>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Tandai Selesai</h4>
              <input type="hidden" name="id" value={workId} />
              <label className="block text-xs text-gray-500 mb-1">Deskripsi Hasil</label>
              <textarea
                name="outcomeDescription"
                rows={3}
                defaultValue="Semua tahapan persyaratan dan bukti telah lengkap; pihak terkait menyetujui hasil akhir."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Selesaikan Pekerjaan
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}