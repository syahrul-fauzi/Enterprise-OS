"use client";

import React from 'react';
import Link from 'next/link';
import type { WorkIdentity } from '@repo/presentation-entities';

export interface RealityIdentityHeaderProps {
  identity: WorkIdentity;
  showBackToReality?: boolean;
}

/**
 * WorkIdentity + Status header untuk Work Reality Surface
 * Komponen atomic yang menampilkan core EOS statement: "THIS IS THE SAME WORK"
 * Direuse oleh semua domain (LawyersHub, ILC, Services.ID)
 */
export function RealityIdentityHeader({ identity, showBackToReality = true }: RealityIdentityHeaderProps) {
  // Debug log to verify header receives identity and renders data-testid elements
  console.log('[WorkRealityHeader] Rendering with identity:', identity);
  return (
    <header className="py-4">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          {showBackToReality && (
            <Link 
              href="/my-reality"
              className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Kembali ke My Reality
            </Link>
          )}
          <h1 className="text-2xl font-bold text-text-primary">{identity.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-status-success-subtle border border-status-success-subtle rounded-full">
              <span className="text-status-success font-medium">{identity.status}</span>
              <span className="text-status-success/80 text-xs font-mono" data-testid="work-id">ID: {identity.workId}</span>
            </span>
            {identity.specialization && (
              <span className="inline-flex items-center px-3 py-1 bg-status-info-subtle border border-status-info-subtle rounded-full text-xs font-medium text-status-info" data-testid="work-specialization">
                {identity.specialization}
              </span>
            )}
            {identity.linkedIntentId && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-surface-highlight-subtle border border-surface-highlight-subtle rounded-full text-xs font-mono text-text-highlight">
                ↳ Intent: <span data-testid="linked-intent-id">{identity.linkedIntentId}</span>
              </span>
            )}
          </div>
        </div>
        <div className="text-text-secondary text-sm">
          <span className="font-semibold">EOS</span>
        </div>
      </div>
    </header>
  );
}