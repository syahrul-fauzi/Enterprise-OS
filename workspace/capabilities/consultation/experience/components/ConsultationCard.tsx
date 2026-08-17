import React from "react";
import { Card } from "@repo/presentation-ui-system";
import type { ConsultationAggregate } from "../../implementation/contracts/consultation.contracts.js";

export interface ConsultationCardProps {
  readonly item: ConsultationAggregate;
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Terbuka",
  UNDERSTANDING: "Memahami Konteks",
  CONTEXT_COMPLETE: "Konteks Lengkap",
  ASSESSING: "Menilai",
  RECOMMENDING: "Memberi Rekomendasi",
  AWAITING_DECISION: "Menunggu Keputusan",
  HANDOFF: "Serah Terima",
  EXECUTING: "Eksekusi",
  RESOLVED: "Selesai",
  PAUSED: "Dijeda",
  RESUMED: "Dilanjutkan",
  WAITING_FOR_INFORMATION: "Menunggu Informasi",
  WAITING_FOR_HUMAN: "Menunggu Manusia",
  ESCALATED: "Dieskalasi",
  REFERRED: "Dirujuk",
  BLOCKED: "Terblokir",
  OUT_OF_SCOPE: "Di Luar Ruang Lingkup",
  CANCELLED: "Dibatalkan",
  draft: "Draft",
  submitted: "Terkirim",
  triaging: "Dalam Proses Analisis",
  actionable: "Siap Ditindaklanjuti",
  closed: "Selesai",
};

const PRIORITY_LABEL: Record<ConsultationAggregate["priority"], string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  critical: "Kritis",
};

const RECOMMENDED_ACTION_LABEL: Record<string, string> = {
  create_legal_case: "Buat Kasus Hukum",
  needs_human_review: "Perlu Review Human",
  create_requirement: "Buat Requirement",
  rejected: "Ditolak",
};

export function ConsultationCard({ item }: ConsultationCardProps) {
  return (
    <Card
      title={
        <h3 className="font-semibold leading-tight" style={{ color: "inherit" }}>
          {item.title}
        </h3>
      }
    >
      <div className="space-y-3">
        <p className="text-sm leading-relaxed">{item.userNeed}</p>
        
        {/* Triage results if available */}
        {item.diagnosis && (
          <div className="p-3 bg-slate-50 rounded-lg text-sm">
            <p className="font-medium">Hasil Analisis:</p>
            <p className="text-slate-600">{item.diagnosis}</p>
            {item.recommendedAction && (
              <p className="mt-1 text-xs text-indigo-600 font-medium">
                Rekomendasi: {RECOMMENDED_ACTION_LABEL[item.recommendedAction] || item.recommendedAction}
              </p>
            )}
            {item.missingFields && item.missingFields.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Data yang perlu dilengkapi: {item.missingFields.join(", ")}
              </p>
            )}
          </div>
        )}
        
        {item.description && (
          <p className="text-sm text-slate-500">{item.description}</p>
        )}

        {/* PT establishment data if collected */}
        {(item.founder || item.businessType || item.domicile) && (
          <div className="p-3 bg-blue-50 rounded-lg text-sm space-y-2">
            <p className="font-medium text-blue-800">Data Pendirian PT:</p>
            {item.businessType && (
              <p className="text-blue-700">Jenis Usaha: {item.businessType.toUpperCase()}</p>
            )}
            {item.founder && (
              <p className="text-blue-700">Pendiri: {item.founder}</p>
            )}
            {item.domicile && (
              <p className="text-blue-700">Domisili: {item.domicile}</p>
            )}
            {item.ownership && (
              <p className="text-blue-700">Kepemilikan: {item.ownership}</p>
            )}
            {item.kbli && (
              <p className="text-blue-700">KBLI: {item.kbli}</p>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium">
            <span>{STATUS_LABEL[item.status]}</span>
            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded border">
              {PRIORITY_LABEL[item.priority]}
            </span>
            {item.linkedWorkItemId && (
              <span className="text-[10px] font-mono normal-case tracking-normal text-green-600">
                Terhubung ke: {item.linkedWorkItemType}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono opacity-60">{item.id}</span>
        </div>
      </div>
    </Card>
  );
}

export default ConsultationCard;