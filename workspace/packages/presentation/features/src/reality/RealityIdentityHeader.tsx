"use client";

import React from 'react';
import type { WorkIdentity } from '@repo/presentation-entities';

export interface RealityIdentityHeaderProps {
  identity: WorkIdentity;
}

/**
 * WorkIdentity + Status header untuk Work Reality Surface
 * Komponen atomic yang menampilkan core EOS statement: "THIS IS THE SAME WORK"
 * Direuse oleh semua domain (LawyersHub, ILC, Services.ID)
 */
export function RealityIdentityHeader({ identity }: RealityIdentityHeaderProps) {
  // Debug log to verify header receives identity and renders data-testid elements
  console.log('[WorkRealityHeader] Rendering with identity:', identity);
  return (
    <header className="py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{identity.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
              <span className="text-emerald-700 font-medium">{identity.status}</span>
              <span className="text-emerald-600 text-xs font-mono" data-testid="work-id">ID: {identity.workId}</span>
            </span>
            {identity.specialization && (
              <span className="inline-flex items-center px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-medium text-blue-700" data-testid="work-specialization">
                {identity.specialization}
              </span>
            )}
            {identity.linkedIntentId && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-50 border border-violet-200 rounded-full text-xs font-mono text-violet-700">
                ↳ Intent: <span data-testid="linked-intent-id">{identity.linkedIntentId}</span>
              </span>
            )}
          </div>
        </div>
        <div className="text-slate-500 text-sm">
          <span className="font-semibold">EOS</span>
        </div>
      </div>
    </header>
  );
}