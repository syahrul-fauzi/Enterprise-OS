"use client";

import React from 'react';
import type { RealityWorkItem } from '../contracts/my-reality.contracts';

interface ActiveWorkSectionProps {
  works: RealityWorkItem[];
  onWorkClick?: (workId: string) => void;
}

export function ActiveWorkSection({ works, onWorkClick }: ActiveWorkSectionProps) {
  if (works.length === 0) return null;

  return (
    <section className="mb-8" aria-labelledby="active-heading">
      <h3 id="active-heading" className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-status-progress"></span>
        Sedang Berjalan
      </h3>
      <div className="grid gap-4">
        {works.map(work => (
          <div key={work.workId} className="bg-surface-sunken border border-surface-border rounded-lg p-5 hover:border-surface-border-hover transition-colors">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-lg font-medium text-text-primary">{work.title}</h4>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-progress/10 text-status-progress text-xs font-medium">
                Sedang diproses
              </span>
            </div>
            <p className="text-sm text-text-secondary mb-4">{work.description || "Pekerjaan ini sedang dalam proses"}</p>
            {work.nextAction && (
              <p className="text-sm text-text-secondary">
                <span className="font-medium">Langkah berikutnya:</span> {work.nextAction.label}
              </p>
            )}
            <div className="flex justify-end mt-4">
              <a 
                href={work.href}
                onClick={(e) => {
                  if (onWorkClick) {
                    e.preventDefault();
                    onWorkClick(work.workId);
                  }
                }}
                className="text-sm text-brand-primary hover:underline flex items-center gap-1"
              >
                Buka pekerjaan
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}