"use client";

import React from "react";
import Link from "next/link";
import type { RealityWorkItem } from "../contracts/my-reality.contracts";

interface MyRealityWorkListItemProps {
  work: RealityWorkItem;
  onNextActionExecute?: (actionId: string, workId?: string) => void | Promise<void>;
}

/**
 * MyRealityWorkListItem - Individual work item component for priority lists
 * Follows canonical rule: Platform is only context, not the center of layout
 * Primary focus: What is the work? What is happening? What matters? What next?
 */
export function MyRealityWorkListItem({
  work,
  onNextActionExecute,
}: MyRealityWorkListItemProps) {
  // Debug: Log work properties untuk memastikan href dan workId terdefinisi
  console.log(`[MyRealityWorkListItem] Render work item: ${work.title}, workId=${work.workId}, href=${work.href}`);
  
  // PASTIKAN href SELALU VALID, tidak pernah undefined
  const workHref = work.href || `/work/${work.workId}`;
  console.log(`[MyRealityWorkListItem] Final href: ${workHref}`);
  
  // SAMA PERSIS DENGAN BENCHMARK /work/[id] untuk KONSISTENSI VISUAL
  const STATUS_LABELS: Record<string, string> = {
    "draft": "Draf",
    "open": "Terbuka",
    "in_progress": "Sedang Diproses",
    "closed": "Selesai",
    "completed": "Selesai",
    "blocked": "Tertunda"
  };

  const STATUS_COLORS: Record<string, string> = {
    "draft": "bg-gray-100 text-gray-800 border-gray-300",
    "open": "bg-blue-100 text-blue-800 border-blue-300",
    "in_progress": "bg-amber-100 text-amber-800 border-amber-300",
    "closed": "bg-emerald-100 text-emerald-800 border-emerald-300",
    "completed": "bg-emerald-100 text-emerald-800 border-emerald-300",
    "blocked": "bg-red-100 text-red-800 border-red-300"
  };

  return (<Link
          href={workHref}
          data-testid={`work-item-${work.workId}`}
          className="block transition-transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-status-info focus:ring-offset-2 rounded-xl"
          aria-label={`Lihat detail pekerjaan: ${work.title}`}
        ><article className="p-6 bg-surface-elevated rounded-xl border border-surface-border shadow-sm hover:shadow-md transition-all duration-eos-fast">
        <div className="flex items-start justify-between gap-6">
        {/* Work Identity & Context (PRIMARY FOCUS) */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-text-primary truncate">
              {work.title}
            </h3>
            {/* Work State - SAMA PERSIS DENGAN BENCHMARK */}
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold border ${STATUS_COLORS[work.state] || "bg-surface-muted text-text-secondary border-surface-muted"}`}>
              {STATUS_LABELS[work.state] || work.state}
            </span>
          </div>
          
          {work.description && (
            <p className="mt-3 text-base text-text-secondary line-clamp-2 leading-relaxed">
              {work.description}
            </p>
          )}

          {/* Meta line: Created date + Platform + Bottleneck (secondary context) */}
          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-text-muted">
            {work.createdAt && (
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Dibuat: {new Date(work.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
            {/* Platform Reference (WHERE this work exists - only context) */}
            {work.platform && (
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {work.platform.name}
              </span>
            )}
            {/* Evidence count if present */}
            {work.evidence?.length > 0 && (
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Dokumen: {work.evidence.length}
              </span>
            )}

            {/* Platform Reference (WHERE this work exists - only context) */}
            {work.platform && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-sunken text-text-secondary">
                {work.platform.name}
              </span>
            )}

            {/* Bottleneck Indicator if present */}
            {work.bottleneck && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-status-danger/10 text-status-danger">
                {work.bottleneck.label}
              </span>
            )}
          </div>
        </div>

        {/* Next Action (call to action if available) */}
        {work.nextAction && (
          <button
            onClick={(e) => {
              // HENTIKAN propagasi click agar tidak memicu Link navigasi
              e.stopPropagation();
              if (onNextActionExecute && work.nextAction?.actionId) {
                onNextActionExecute(work.nextAction.actionId, work.workId);
              }
            }}
            className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-text-inverse bg-brand-primary rounded-lg hover:bg-brand-primary/90 hover:shadow-token-md focus:ring-4 focus:ring-brand-primary/30 focus:outline-none shadow-token-sm transition-all duration-eos-fast"
            type="button"
            aria-label={`Jalankan tindakan: ${work.nextAction.label} untuk pekerjaan: ${work.title}`}
          >
            {work.nextAction.label}
          </button>
        )}
        </div>
      </article>
    </Link>
  );
}