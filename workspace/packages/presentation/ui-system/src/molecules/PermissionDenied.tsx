"use client";

import React from "react";

/**
 * PermissionDenied — Shared 403/forbidden state component untuk semua Work Reality Surface
 * Menghilangkan duplikasi inline permission state implementation di seluruh vertical
 * Memenuhi UX state consistency mandate: shared presentation behavior, bukan copy-paste
 */
export interface PermissionDeniedProps {
  /** Judul untuk state forbidden (default: "Access Denied") */
  readonly title?: string;
  /** Deskripsi tambahan (opsional) */
  readonly description?: string;
  /** Ikon yang ditampilkan (opsional, default: 🔒) */
  readonly icon?: string;
  /** Teks tombol kembali (opsional) */
  readonly backLabel?: string;
  /** Handler klik tombol kembali (opsional) */
  readonly onBack?: () => void;
  /** Class tambahan untuk kustomisasi (opsional) */
  readonly className?: string;
}

export function PermissionDenied({
  title = "Access Denied",
  description = "You don't have permission to access this resource. Contact your administrator if you think this is an error.",
  icon = "🔒",
  backLabel = "Go Back",
  onBack,
  className = "",
}: PermissionDeniedProps) {
  return (
    <div className={`text-center py-16 border-2 border-amber-200 rounded-3xl bg-amber-50 ${className}`}>
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-amber-900 mb-2">{title}</h3>
      <p className="text-amber-700 max-w-md mx-auto mb-6">{description}</p>
      {onBack && (
        <button
          onClick={onBack}
          className="px-6 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition inline-block"
        >
          {backLabel}
        </button>
      )}
    </div>
  );
}