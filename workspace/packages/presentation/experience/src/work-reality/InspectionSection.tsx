"use client";

import React from 'react';
import type { WorkInspection, WorkRealityPerspective } from '@repo/presentation-entities';

// Perspective-specific header labels (hanya dipakai oleh operator/agent, tidak pernah dilihat customer/professional)
const perspectiveLabels: Record<WorkRealityPerspective, string> = {
  customer: "", // Tidak akan pernah digunakan - section disembunyikan dari customer
  professional: "", // Tidak akan pernah digunakan - section disembunyikan dari professional
  operator: "INSPECTION",
  agent: "AUDIT",
  notary: "VERIFIKASI"
};

interface InspectionSectionProps {
  inspections: WorkInspection[];
  perspective: WorkRealityPerspective;
}

/**
 * INSPECTION section - hanya untuk operator/agent
 * Menampilkan hasil pengecekan otomatis EOS tentang continuity Work
 * Tidak ditampilkan ke customer/professional untuk menghindari noise
 * Perspective-aware label untuk operator vs agent
 */
export function InspectionSection({ inspections, perspective }: InspectionSectionProps) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        {perspectiveLabels[perspective]}
      </h2>
      <div className="space-y-2">
        {inspections.map((check, i) => (
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
  );
}