"use client";

import React from 'react';
import type { WorkRealityPerspective } from './work-reality.types';

// Perspective-specific header labels
const perspectiveLabels: Record<WorkRealityPerspective, string> = {
  customer: "SELanjutnya",
  professional: "LANJUTAN",
  operator: "NEXT",
  agent: "NEXT STEP",
  notary: "LANGKAH SELANJUTNYA"
};

interface NextSectionProps {
  nextAction: string;
  perspective: WorkRealityPerspective;
}

/**
 * NEXT section - menampilkan langkah selanjutnya untuk Work ini dengan perspective-aware labels
 * Konten difilter berdasarkan perspective (hanya tampilkan action yang relevan untuk actor tersebut)
 */
export function NextSection({ nextAction, perspective }: NextSectionProps) {
  // Only show next action to the responsible actor - hide from others
  const shouldShowAction = perspective === 'operator' || perspective === 'agent' || perspective === 'notary';
  
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        {perspectiveLabels[perspective]}
      </h2>
      <p className="text-lg text-slate-800">
        {shouldShowAction ? nextAction : "Semua proses berjalan sesuai jadwal"}
      </p>
    </section>
  );
}