"use client";

import React from 'react';
import type { WorkRealityPerspective } from './work-reality.types';

// Perspective-specific header labels
const perspectiveLabels: Record<WorkRealityPerspective, string> = {
  customer: "SEDANG BERJALAN",
  professional: "SAAT INI",
  operator: "NOW",
  agent: "CURRENT",
  notary: "SAAT INI"
};

// Perspective-specific status labels
const statusLabels: Record<WorkRealityPerspective, string> = {
  customer: "Status: ",
  professional: "Status: ",
  operator: "Status: ",
  agent: "State: ",
  notary: "Status: "
};

interface NowSectionProps {
  description: string;
  status: string;
  perspective: WorkRealityPerspective;
}

/**
 * NOW section - menampilkan keadaan terkini dari Work dengan perspective-aware labels
 * Konten disesuaikan berdasarkan siapa yang melihatnya, sambil tetap mempertahankan struktur inti
 */
export function NowSection({ description, status, perspective }: NowSectionProps) {
  // Hide technical status from customer perspective - show only description
  const showStatus = perspective !== 'customer';
  
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        {perspectiveLabels[perspective]}
      </h2>
      <p className="text-lg text-slate-800">{description}</p>
      {showStatus && (
        <div className="mt-2 inline-flex px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
          {statusLabels[perspective]}{status.replace("_", " ")}
        </div>
      )}
    </section>
  );
}