"use client";

import React from 'react';

/**
 * WorkRealityLoading — Shared loading state untuk Work Reality Surface
 * Diekstrak dari route apps/web agar bisa di-reuse oleh semua produk yang menggunakan WorkRealitySurface
 * Menjaga thin app mandate: route tidak perlu menduplikasi loading UI
 */
export interface WorkRealityLoadingProps {}

export function WorkRealityLoading(props: WorkRealityLoadingProps) {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="border rounded-2xl bg-white p-8 shadow-sm">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </main>
  );
}