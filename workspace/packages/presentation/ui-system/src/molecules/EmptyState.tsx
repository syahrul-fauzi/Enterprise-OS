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
  /** Pesan tambahan (alias description, kompatibilitas) */
  readonly message?: string;
  /** Deskripsi tambahan (opsional) */
  readonly description?: string;
  /** Ikon yang ditampilkan (opsional, default: 📭) */
  readonly icon?: ReactNode;
  /** Teks tombol aksi (legacy, gunakan primaryActionLabel) */
  readonly actionLabel?: string;
  /** Handler klik tombol aksi (legacy, gunakan onPrimaryAction) */
  readonly onAction?: () => void;
  /** Teks tombol aksi utama (dukungan untuk widget yang sudah menggunakan nama baru) */
  readonly primaryActionLabel?: string;
  /** Handler klik tombol aksi utama (dukungan untuk widget yang sudah menggunakan nama baru) */
  readonly onPrimaryAction?: () => void;
  /** Class tambahan untuk kustomisasi (opsional) */
  readonly className?: string;
}

export function EmptyState({
  title,
  description,
  message,
  icon = "📭",
  actionLabel,
  onAction,
  primaryActionLabel,
  onPrimaryAction,
  className = "",
}: EmptyStateProps) {
  const finalActionLabel = primaryActionLabel || actionLabel;
  const finalOnAction = onPrimaryAction || onAction;
  const finalDescription = description || message;
  
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-text-primary mb-2">{title}</h3>
      {finalDescription && (
        <p className="text-text-muted max-w-md mx-auto mb-6">{finalDescription}</p>
      )}
      {finalActionLabel && finalOnAction && (
        <button
          onClick={finalOnAction}
          className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition inline-block"
        >
          {finalActionLabel}
        </button>
      )}
    </div>
  );
}