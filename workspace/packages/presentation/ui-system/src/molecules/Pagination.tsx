"use client";

import React from "react";

/**
 * Pagination — Shared pagination component untuk semua Work Reality Surface
 * Menghilangkan duplikasi inline pagination implementation di seluruh vertical
 * Memenuhi UX state consistency mandate: shared presentation behavior, bukan copy-paste
 */
export interface PaginationProps {
  /** Halaman saat ini (mulai dari 1) */
  readonly currentPage: number;
  /** Total jumlah halaman */
  readonly totalPages: number;
  /** Total item yang dipaginasi */
  readonly totalItems: number;
  /** Jumlah item per halaman */
  readonly itemsPerPage: number;
  /** Handler untuk pergantian halaman */
  readonly onPageChange: (page: number) => void;
  /** Class tambahan untuk kustomisasi (opsional) */
  readonly className?: string;
  /** Apakah disable semua interaksi (opsional, default: false) */
  readonly disabled?: boolean;
  /** Label kustom untuk mendukung multibahasa/vertical vocabulary (opsional) */
  readonly labels?: {
    previous?: string;
    next?: string;
    showing?: string;
    of?: string;
  };
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = "",
  disabled = false,
  labels = {
    previous: "Previous",
    next: "Next",
    showing: "Showing",
    of: "of",
  },
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrevious = () => {
    if (currentPage > 1 && !disabled) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages && !disabled) onPageChange(currentPage + 1);
  };

  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-6 ${className}`}>
      <div className="text-sm text-slate-600">
        {labels.showing} <span className="font-semibold">{startItem}</span>-<span className="font-semibold">{endItem}</span> {labels.of} <span className="font-semibold">{totalItems}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1 || disabled}
          className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          ← {labels.previous}
        </button>
        
        {generatePageNumbers().map((page, idx) => (
          typeof page === "number" ? (
            <button
              key={idx}
              onClick={() => !disabled && onPageChange(page)}
              disabled={disabled}
              className={`px-4 py-2 rounded-lg transition ${
                page === currentPage
                  ? "bg-indigo-600 text-white font-semibold"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              }`}
            >
              {page}
            </button>
          ) : (
            <span key={idx} className="px-2 text-slate-400">...</span>
          )
        ))}

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages || disabled}
          className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {labels.next} →
        </button>
      </div>
    </div>
  );
}