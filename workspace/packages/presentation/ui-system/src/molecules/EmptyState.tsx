"use client";

import React from "react";
import type { ReactNode } from "react";

/**
 * EmptyState — Shared empty state component untuk semua Work Reality Surface
 * Menghilangkan duplikasi inline empty state implementation di seluruh vertical
 * Memenuhi UX state consistency mandate: shared presentation behavior, bukan copy-paste
 */
export interface EmptyStateProps {
  /** Judul untuk state kosong */
  readonly title: string;
  /** Deskripsi tambahan (opsional) */
  readonly description?: string;
  /** Ikon yang ditampilkan (opsional, default: 📭) */
  readonly icon?: string;
  /** Teks tombol aksi (opsional) */
  readonly actionLabel?: string;
  /** Handler klik tombol aksi (opsional) */
  readonly onAction?: () => void;
  /** Class tambahan untuk kustomisasi (opsional) */
  readonly className?: string;
}

export function EmptyState({
  title,
  description,
  icon = "📭",
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      {description && (
        <p className="text-slate-600 max-w-md mx-auto mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition inline-block"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}