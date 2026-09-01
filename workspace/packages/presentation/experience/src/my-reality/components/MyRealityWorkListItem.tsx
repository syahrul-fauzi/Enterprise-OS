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
  // State color mapping for visual status indication
  const stateColors = {
    open: "bg-surface-sunken text-text-secondary",
    in_progress: "bg-status-info/10 text-status-info",
    blocked: "bg-status-danger/10 text-status-danger",
    completed: "bg-status-success/10 text-status-success",
  };

  // State label mapping (Indonesian for local context)
  const stateLabels = {
    open: "Dibuka",
    in_progress: "Diproses",
    blocked: "Terhambat",
    completed: "Selesai",
  };

  return (
    <Link
      href={work.href || '/'}
      data-testid={`work-item-${work.workId}`}
      className="block p-4 bg-surface-elevated rounded-xl border border-surface-border shadow-token-sm hover:shadow-token-md hover:border-surface-border-strong focus:outline-none focus:ring-4 focus:ring-status-info/30 transition-all duration-eos-fast"
    >
      <article className="flex items-start gap-4">
        {/* Work Identity & Context (PRIMARY FOCUS) */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-text-primary truncate">
            {work.title}
          </h3>
          
          {work.description && (
            <p className="mt-1 text-sm text-text-secondary line-clamp-2">
              {work.description}
            </p>
          )}

          {/* Meta line: State + Platform + Bottleneck (secondary context) */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* Work State */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${stateColors[work.state]}`}>
              {stateLabels[work.state]}
            </span>

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
              e.preventDefault();
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
      </article>
    </Link>
  );
}