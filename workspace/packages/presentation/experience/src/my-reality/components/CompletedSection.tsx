"use client";

import React from 'react';
import type { RealityWorkItem } from '../contracts/my-reality.contracts';

interface CompletedSectionProps {
  works: RealityWorkItem[];
  onWorkClick?: (workId: string) => void;
  limit?: number;
}

export function CompletedSection({ works, onWorkClick, limit = 4 }: CompletedSectionProps) {
  if (works.length === 0) return null;

  const displayedWorks = works.slice(0, limit);

  return (
    <section className="mb-8" aria-labelledby="completed-heading">
      <h3 id="completed-heading" className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-status-completed"></span>
        Selesai
      </h3>
      <p className="text-lg text-text-secondary mb-4">{works.length} pekerjaan selesai</p>
      <div className="grid gap-3 md:grid-cols-2">
        {displayedWorks.map(work => (
          <div key={work.workId} className="bg-surface-sunken border border-surface-border rounded-lg p-4 opacity-80">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-status-completed/10 text-status-completed text-xs font-medium mb-2">
              <span className="w-1.5 h-1.5 bg-status-completed rounded-full"></span>
              SELESAI
            </span>
            <h4 className="font-medium text-text-primary mb-1 line-clamp-1">{work.title}</h4>
            <a 
              href={work.href}
              onClick={(e) => {
                if (onWorkClick) {
                  e.preventDefault();
                  onWorkClick(work.workId);
                }
              }}
              className="text-xs text-brand-primary hover:underline"
            >
              Lihat detail
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}