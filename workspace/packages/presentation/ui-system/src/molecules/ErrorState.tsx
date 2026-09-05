"use client";

import React from "react";
import type { ReactNode } from "react";

/**
 * ErrorState — Shared error state component untuk semua Work Reality Surface
 * Menghilangkan duplikasi inline error state implementation di seluruh vertical
 * Memenuhi UX state consistency mandate: shared presentation behavior, bukan copy-paste
 */
export interface ErrorStateProps {
  /** Judul untuk state error */
  readonly title: string;
  /** Deskripsi error (opsional) */
  readonly description?: string;
  /** Ikon yang ditampilkan (opsional, default: ⚠️) */
  readonly icon?: string;
  /** Teks tombol retry (opsional) */
  readonly retryLabel?: string;
  /** Handler klik tombol retry (opsional) */
  readonly onRetry?: () => void;
  /** Class tambahan untuk kustomisasi (opsional) */
  readonly className?: string;
  /** Apakah error bersifat fatal (opsional, default: false) */
  readonly fatal?: boolean;
}

export function ErrorState({
  title,
  description,
  icon = "⚠️",
  retryLabel,
  onRetry,
  className = "",
  fatal = false,
}: ErrorStateProps) {
  const baseClasses = fatal 
    ? "text-center py-16 border-2 border-red-200 rounded-3xl bg-red-50" 
    : "text-center py-12";
  
  const textColor = fatal ? "text-red-900" : "text-slate-900";
  const descColor = fatal ? "text-red-700" : "text-slate-600";
  const buttonColor = fatal 
    ? "bg-red-600 hover:bg-red-700" 
    : "bg-blue-600 hover:bg-blue-700";

  return (
    <div className={`${baseClasses} ${className}`}>
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className={`text-xl font-bold ${textColor} mb-2`}>{title}</h3>
      {description && (
        <p className={`${descColor} max-w-md mx-auto mb-6`}>{description}</p>
      )}
      {retryLabel && onRetry && (
        <button
          onClick={onRetry}
          className={`px-6 py-3 text-white rounded-xl transition inline-block ${buttonColor}`}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}