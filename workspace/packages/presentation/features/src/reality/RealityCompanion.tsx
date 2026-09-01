"use client";

import React from 'react';

// Shared Companion types to prevent circular dependency with experience layer
export interface CompanionInsightAction {
  actionId: string;
  label: string;
  capability: string;
}

export interface CompanionInsight {
  id: string;
  title: string;
  description: string;
  severity?: 'info' | 'warning' | 'critical';
  workId?: string;
  action?: CompanionInsightAction;
}

export interface RealityCompanionProps {
  insights: CompanionInsight[];
  onInsightAction?: (insightId: string) => void;
}

/**
 * Building block for EOS COMPANION section in My Reality
 * Only renders when there are actual insights to display (no empty forced UI)
 * Follows Presentation Constitution: pure presentation component, no business logic
 */
export function RealityCompanion({ insights, onInsightAction }: RealityCompanionProps) {
  if (insights.length === 0) return null;

  const getSeverityStyles = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'bg-status-danger/10 border-status-danger/30 text-status-danger';
      case 'warning': return 'bg-status-warning/10 border-status-warning/30 text-status-warning';
      default: return 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary';
    }
  };

  return (
    <section className="mb-8" aria-labelledby="companion-heading">
      <h3 id="companion-heading" className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
        <span className="text-2xl">💡</span>
        EOS Companion
      </h3>
      <div className="space-y-4">
        {insights.map(insight => (
          <div 
            key={insight.id} 
            className={`border rounded-xl p-5 ${getSeverityStyles(insight.severity)}`}
          >
            <h4 className="font-semibold mb-2">{insight.title}</h4>
            <p className="text-sm mb-4 opacity-90">{insight.description}</p>
            {insight.action && (
              <button
                onClick={() => onInsightAction?.(insight.id)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
              >
                {insight.action.label}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}