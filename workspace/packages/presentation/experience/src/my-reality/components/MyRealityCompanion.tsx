"use client";

import React from "react";
import type { CompanionInsight } from "../contracts/my-reality.contracts";

interface MyRealityCompanionProps {
  insights: CompanionInsight[];
  onInsightAction?: (insightId: string) => void;
}

/**
 * MyRealityCompanion - Sidebar companion component for EOS My Reality
 * Follows canonical rule: NOT a chatbot. Only presents proactive operational insights.
 * Location: experience/my-reality/components/MyRealityCompanion.tsx
 * Complies with EOS design principles: calm operational contextual
 * Displays only actionable, reality-based insights from model.companion.insights
 */
export function MyRealityCompanion({
  insights,
  onInsightAction,
}: MyRealityCompanionProps) {
  // Severity color mapping for insight badges (supports all CompanionInsight.severity values)
  const severityColors: Record<CompanionInsight["severity"], string> = {
    low: "bg-surface-sunken text-text-secondary",
    medium: "bg-status-warning/10 text-status-warning",
    high: "bg-status-danger/10 text-status-danger",
    critical: "bg-status-danger text-status-dangerForeground",
  };

  const severityLabels: Record<CompanionInsight["severity"], string> = {
    low: "Rekomendasi",
    medium: "Penting",
    high: "Mendesak",
    critical: "KRITIS",
  };

  return (
    <div className="bg-surface-elevated rounded-xl border border-surface-border shadow-token-md p-5 space-y-4 sticky top-6">
      {/* Companion Header */}
      <div className="border-b border-surface-border pb-4">
        <h2 className="text-lg font-semibold text-text-primary">EOS Companion</h2>
        <p className="mt-1 text-sm text-text-secondary">Wawasan real-time dari realitas pekerjaan Anda</p>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {insights.length === 0 ? (
          <p className="text-sm text-text-muted italic text-center py-4">Tidak ada wawasan aktif saat ini.</p>
        ) : (
          insights.map((insight) => (
            <div
              key={insight.id}
              className="p-4 rounded-lg border border-surface-border bg-surface-sunken hover:bg-surface transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${severityColors[insight.severity]}`}>
                      {severityLabels[insight.severity]}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-text-primary">{insight.title}</p>
                  
                  {/* Action Button if available */}
                  {insight.actionLabel && (
                    <button
                      onClick={() => onInsightAction?.(insight.id)}
                      className="mt-3 w-full px-3 py-1.5 text-sm font-medium text-text-inverse bg-brand-primary rounded-lg hover:bg-brand-primary/90 hover:shadow-token-md focus:ring-4 focus:ring-brand-primary/30 focus:outline-none shadow-token-sm transition-all duration-eos-fast"
                      type="button"
                    >
                      {insight.actionLabel}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}