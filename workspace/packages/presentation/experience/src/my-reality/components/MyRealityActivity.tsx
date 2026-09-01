"use client";

import React from "react";
import type { RealityActivity } from "../contracts/my-reality.contracts";

interface MyRealityActivityProps {
  items: RealityActivity[];
  maxItems?: number;
  onWorkClick?: (workId: string) => void;
}

/**
 * MyRealityActivity - Activity timeline feed for My Reality experience
 * Location: experience/my-reality/components/MyRealityActivity.tsx
 * Follows EOS design principles: calm operational contextual
 * Displays chronological activity from model.activity with relative timestamps
 * All platform references are context-only, not primary focus
 */
export function MyRealityActivity({
  items,
  maxItems = 15,
  onWorkClick,
}: MyRealityActivityProps) {
  // Activity type configuration for visual mapping - using semantic design tokens
  const typeConfig: Record<RealityActivity["type"], {
    label: string;
    bgColor: string;
    textColor: string;
    icon: React.ReactNode;
  }> = {
    completed: {
      label: "Selesai",
      bgColor: "bg-status-success/10",
      textColor: "text-status-success",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
    },
    note: {
      label: "Catatan",
      bgColor: "bg-surface-sunken",
      textColor: "text-text-secondary",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    },
    status: {
      label: "Status Update",
      bgColor: "bg-status-info/10",
      textColor: "text-status-info",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
    },
    created: {
      label: "Dibuat",
      bgColor: "bg-brand-primary/10",
      textColor: "text-brand-primary",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
    },
    assigned: {
      label: "Ditugaskan",
      bgColor: "bg-status-warning/10",
      textColor: "text-status-warning",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v1z" /></svg>
    },
    evidence: {
      label: "Evidence",
      bgColor: "bg-status-success/10",
      textColor: "text-status-success",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    },
    communication: {
      label: "Komunikasi",
      bgColor: "bg-brand-secondary/10",
      textColor: "text-brand-secondary",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
    },
    external: {
      label: "External",
      bgColor: "bg-status-danger/10",
      textColor: "text-status-danger",
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
    },
  };

  // Format relative timestamp (e.g., "2 jam yang lalu")
  const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    return `${diffDays} hari yang lalu`;
  };

  // Limit items to maxItems
  const displayItems = maxItems ? items.slice(0, maxItems) : items;

  if (displayItems.length === 0) {
    return (
      <div className="bg-surface-sunken rounded-xl p-8 border border-surface-border text-center">
        <p className="text-text-secondary italic">Tidak ada aktivitas terbaru.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-text-primary border-b border-surface-border pb-3">
        Aktivitas Terbaru
        <span className="ml-2 text-sm font-normal text-text-muted">
          ({displayItems.length} dari {items.length})
        </span>
      </h2>
      
      <div className="relative">
        {/* Timeline vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-surface-border" />
        
        <div className="space-y-4">
          {displayItems.map((activity, index) => {
            const config = typeConfig[activity.type];
            const isClickable = !!activity.relatedWorkId;
            return (
              <article
                key={activity.id}
                data-testid={activity.relatedWorkId ? `activity-item-${activity.relatedWorkId}` : `activity-item-${activity.id}`}
                className={`relative pl-12 ${index === displayItems.length - 1 ? "pb-0" : "pb-4"}`}
                onClick={() => isClickable && onWorkClick?.(activity.relatedWorkId)}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onWorkClick?.(activity.relatedWorkId);
                  }
                }}
                aria-label={isClickable ? `Lihat detail pekerjaan: ${activity.title}` : undefined}
              >
                {/* Timeline dot */}
                <div className={`absolute left-3 w-5 h-5 rounded-full ${config.bgColor} flex items-center justify-center ring-4 ring-surface`}>
                  <span className={config.textColor}>{config.icon}</span>
                </div>
                
                {/* Activity card */}
                <div
                  className={`bg-surface-elevated rounded-xl border border-surface-border shadow-token-sm p-4 transition-all duration-eos-fast ${
                    isClickable 
                      ? "cursor-pointer hover:shadow-token-md hover:border-surface-border-strong focus-within:ring-4 focus-within:ring-status-info/30" 
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                          {config.icon}
                          {config.label}
                        </span>
                        {activity.platform && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-sunken text-text-secondary">
                            {activity.platform.name}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm font-medium text-text-primary">{activity.title}</p>
                      {activity.description && (
                        <p className="mt-1 text-sm text-text-secondary line-clamp-2">{activity.description}</p>
                      )}
                      
                      {/* Actor & timestamp */}
                      <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                        {activity.actor?.name && (
                          <>
                            <span>{activity.actor.name}</span>
                            <span>•</span>
                          </>
                        )}
                        <time dateTime={activity.timestamp}>{formatRelativeTime(activity.timestamp)}</time>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}