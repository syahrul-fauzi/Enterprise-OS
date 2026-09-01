"use client";

import React from 'react';
import type { RealityWorkItem } from '../contracts/my-reality.contracts';

interface WaitingSectionProps {
  works: RealityWorkItem[];
  currentActorId: string;
}

export function WaitingSection({ works, currentActorId }: WaitingSectionProps) {
  if (works.length === 0) return null;

  const waitingForMe = works.filter(w => w.actorId === currentActorId).length;
  const waitingForOthers = works.filter(w => w.actorId !== currentActorId).length;

  return (
    <section className="mb-8" aria-labelledby="waiting-heading">
      <h3 id="waiting-heading" className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-status-warning"></span>
        Menunggu
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-surface-elevated border border-surface-border rounded-xl p-5">
          <h4 className="text-lg font-semibold text-text-primary mb-3">Menunggu Anda</h4>
          <p className="text-2xl font-bold text-text-primary">{waitingForMe} pekerjaan</p>
          <p className="text-sm text-text-secondary mt-1">Perlu tindakan dari Anda untuk dilanjutkan</p>
        </div>
        
        <div className="bg-surface-elevated border border-surface-border rounded-xl p-5">
          <h4 className="text-lg font-semibold text-text-primary mb-3">Menunggu orang lain</h4>
          <p className="text-2xl font-bold text-text-primary">{waitingForOthers} pekerjaan</p>
          <p className="text-sm text-text-secondary mt-1">Menunggu respons dari pihak lain</p>
        </div>
      </div>
    </section>
  );
}