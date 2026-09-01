"use client";

import React from 'react';
import type { WorkRealityPerspective } from '@repo/presentation-entities';

// Perspective-specific vocabulary mapping
const perspectiveLabels: Record<WorkRealityPerspective, string> = {
  customer: "KASUS ANDA",
  professional: "KASUS DALAM PENANGANAN",
  operator: "WORK",
  agent: "CASE",
  notary: "DOKUMEN NOTARIS"
};

export interface RealityWorkHeaderProps {
  title: string;
  perspective: WorkRealityPerspective;
}

/**
 * WORK section - menampilkan identitas inti dari Work dengan perspective-aware vocabulary
 * Satu komponen, konten disesuaikan berdasarkan siapa yang melihatnya (one model, many perspectives)
 */
export function RealityWorkHeader({ title, perspective }: RealityWorkHeaderProps) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        {perspectiveLabels[perspective]}
      </h2>
      <p className="text-xl font-semibold text-slate-900">{title}</p>
    </section>
  );
}