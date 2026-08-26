"use client";

import React from 'react';
import type { WorkIdentity } from './work-reality.types';

interface WorkRealityHeaderProps {
  identity: WorkIdentity;
}

/**
 * WorkIdentity + Status header untuk Work Reality Surface
 * Komponen atomic yang menampilkan core EOS statement: "THIS IS THE SAME WORK"
 * Direuse oleh semua domain (LawyersHub, ILC, Services.ID)
 */
export function WorkRealityHeader({ identity }: WorkRealityHeaderProps) {
  return (
    <header className="text-center py-6">
      <h1 className="text-3xl font-bold text-slate-900">EOS</h1>
      <p className="text-lg text-slate-600 mt-2">WHAT IS HAPPENING?</p>
      <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
        <span className="text-emerald-700 font-semibold">THIS IS THE SAME WORK.</span>
        <span className="text-emerald-600 text-sm font-mono">ID: {identity.workId}</span>
      </div>
    </header>
  );
}