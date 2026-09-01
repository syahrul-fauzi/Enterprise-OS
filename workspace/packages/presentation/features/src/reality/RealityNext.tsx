"use client";

import React from 'react';

// Shared RealityWorkItem type to prevent circular dependency with experience layer
export type RealityWorkItem = {
  workId: string;
  id: string;
  title: string;
  description?: string;
  state: "open" | "in_progress" | "blocked" | "completed";
  priority: "now" | "next" | "watching";
  platform?: any;
  bottleneck?: any;
  nextAction?: any;
  href: string;
  createdAt: string;
  updatedAt: string;
  actorId: string;
  workspaceId: string;
  tenantId: string;
  evidence?: Array<{ id: string; type: string; createdAt: string }>;
};

export interface RealityNextProps {
  works: RealityWorkItem[];
  onWorkClick?: (workId: string) => void;
}

/**
 * NEXT section - menampilkan langkah selanjutnya untuk daftar Work dengan perspective-aware labels
 * Konten difilter berdasarkan work yang perlu diproses selanjutnya
 * Mengikuti pola yang sama dengan RealityWatching untuk konsistensi antar komponen
 */
export function RealityNext({ works, onWorkClick }: RealityNextProps) {
  const activeWorks = works.filter(work => work.state !== "completed");
  
  if (activeWorks.length === 0) {
    return (
      <section className="mb-8" aria-labelledby="next-heading">
        <h3 id="next-heading" className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-amber-400"></span>
        LANJUTAN
        </h3>
        <div className="bg-surface-sunken/50 border border-surface-border/50 rounded-lg p-6 text-center">
          <p className="text-text-secondary">Tidak ada pekerjaan yang perlu diproses selanjutnya.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8" aria-labelledby="next-heading">
      <h3 id="next-heading" className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-amber-400"></span>
        LANJUTAN
      </h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeWorks.map(work => (
          <div key={work.workId} className="bg-surface-sunken/50 border border-surface-border/50 rounded-lg p-4 hover:border-surface-border transition-colors">
            <p className="font-medium text-text-primary text-sm">{work.title}</p>
            <a 
              href={work.href}
              onClick={(e) => {
                if (onWorkClick) {
                  e.preventDefault();
                  onWorkClick(work.workId);
                }
              }}
              className="text-xs text-brand-primary hover:underline mt-2 inline-flex items-center gap-1"
            >
              Lihat detail
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}