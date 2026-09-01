"use client";

import React from 'react';
import type { RealityWorkItem } from '../contracts/my-reality.contracts';

interface NeedAttentionSectionProps {
  works: RealityWorkItem[];
  onWorkClick?: (workId: string) => void;
}

export function NeedAttentionSection({ works, onWorkClick }: NeedAttentionSectionProps) {
  if (works.length === 0) return null;

  return (
    <section className="mb-8" aria-labelledby="attention-heading">
      <h3 id="attention-heading" className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-status-danger animate-pulse"></span>
        Perlu Perhatian
      </h3>
      <div className="grid gap-4">
        {works.map(work => (
          <div key={work.workId} className="bg-surface-elevated border-2 border-status-danger/30 rounded-xl p-6 hover:border-status-danger/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-xl font-semibold text-text-primary">{work.title}</h4>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-danger/10 text-status-danger text-sm font-medium">
                Perlu tindakan
              </span>
            </div>
            <p className="text-text-secondary mb-4">{work.bottleneck?.description || work.description || "Pekerjaan ini menunggu aksi Anda untuk dilanjutkan"}</p>
            {work.nextAction && (
              <div className="mb-6 p-3 bg-surface-sunken rounded-lg">
                <p className="text-sm text-text-secondary">
                  <span className="font-medium">Berikutnya:</span> {work.nextAction.label}
                </p>
              </div>
            )}
            <div className="flex justify-end">
              <a 
                href={work.href} 
                onClick={(e) => {
                  if (onWorkClick) {
                    e.preventDefault();
                    onWorkClick(work.workId);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors font-medium"
              >
                Lanjutkan pekerjaan
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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