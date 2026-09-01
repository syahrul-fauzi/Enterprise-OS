"use client";

import React from 'react';
import type { PlatformReference, RealityWorkItem } from "@repo/presentation-entities";

// Derive dependent types from RealityWorkItem for type safety
type Bottleneck = NonNullable<RealityWorkItem["bottleneck"]>;
type WorkNextAction = NonNullable<RealityWorkItem["nextAction"]>;

// Generic platform icon that works with any PlatformReference
const PlatformIcon = ({ platform }: { platform?: PlatformReference }) => {
  const iconClass = "w-9 h-9 rounded-md flex items-center justify-center";
  if (!platform) {
    return <div className={`${iconClass} bg-surface-sunken text-text-muted`}>
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>;
  }
  
  return (
    <div 
      className={`${iconClass}`}
      style={{ backgroundColor: platform.bgColor, color: platform.textColor }}
      aria-label={`Platform: ${platform.label}`}
    >
      {/* Platform-specific icon would be resolved here - base implementation uses document icon */}
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
  );
};

const ChevronRightIcon = () => (
  <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

// Domain-agnostic interface supporting all work types (internal + external platforms)
export interface WorkItemCardProps {
  // Core work properties - compatible with RealityWorkItem
  workId: string;
  title: string;
  description?: string;
  state: "open" | "in_progress" | "blocked" | "completed";
  platform?: PlatformReference;
  bottleneck?: Bottleneck;
  nextAction?: WorkNextAction;
  href?: string;
  updatedAt?: string;
  onClick?: (workId: string) => void;
  // Legacy properties for backward compatibility with existing use cases
  id?: string;
  statusTag?: string;
  statusType?: 'support' | 'review' | 'shipping';
  customer?: string;
  waitingTime?: string;
  sla?: {
    label: string;
    percentage: number;
  };
}

// State-to-UI mapping for human-centric presentation
const stateConfig: Record<WorkItemCardProps["state"], { 
  label: string; 
  barColor: string; 
  badgeClass: string;
}> = {
  open: { 
    label: "Menunggu", 
    barColor: "bg-status-info", 
    badgeClass: "bg-status-info/10 text-status-info-fg border-status-info/20" 
  },
  in_progress: { 
    label: "Berjalan", 
    barColor: "bg-status-warning", 
    badgeClass: "bg-status-warning/10 text-status-warning-fg border-status-warning/20" 
  },
  blocked: { 
    label: "Terhambat", 
    barColor: "bg-status-danger", 
    badgeClass: "bg-status-danger/10 text-status-danger-fg border-status-danger/20" 
  },
  completed: { 
    label: "Selesai", 
    barColor: "bg-status-success", 
    badgeClass: "bg-status-success/10 text-status-success-fg border-status-success/20" 
  },
};

// Legacy status mapping for backward compatibility
const legacyStatusIntent: Record<'support' | 'review' | 'shipping', 'danger' | 'warning' | 'info'> = {
  support: 'danger',
  review: 'warning',
  shipping: 'info',
};

const legacyPriorityBarColor: Record<'support' | 'review' | 'shipping', string> = {
  support: 'bg-status-danger',
  review: 'bg-status-warning',
  shipping: 'bg-status-info',
};

const legacyStatusBadgeClass: Record<'danger' | 'warning' | 'info', string> = {
  danger: 'bg-status-danger/10 text-status-danger-fg border-status-danger/20',
  warning: 'bg-status-warning/10 text-status-warning-fg border-status-warning/20',
  info: 'bg-status-info/10 text-status-info-fg border-status-info/20',
};

export function WorkItemCard({
  workId,
  title,
  description,
  state,
  platform,
  bottleneck,
  nextAction,
  href,
  updatedAt,
  onClick,
  // Legacy props
  id,
  statusTag,
  statusType = 'support',
  customer,
  waitingTime,
  sla,
}: WorkItemCardProps) {
  // Determine if we're using new human-centric props or legacy platform-specific props
  const isLegacyMode = !state && statusType;
  
  // Calculate UI classes based on mode
  const config = isLegacyMode 
    ? {
        barColor: legacyPriorityBarColor[statusType],
        badgeClass: legacyStatusBadgeClass[legacyStatusIntent[statusType]],
        label: statusTag || "Unknown"
      }
    : stateConfig[state];

  const handleClick = () => {
    if (onClick) {
      onClick(workId);
    }
  };

  const displayId = id || workId;
  const displayDescription = description || (isLegacyMode ? "" : bottleneck?.description || "Tidak ada deskripsi");
  const displayStatusTag = statusTag || config.label;

  return (
    <div
      className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-md hover:bg-surface-sunken transition-colors cursor-pointer group"
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      aria-label={`${title} - ${displayStatusTag}`}
    >
      <div className={`w-1.5 self-stretch min-h-[3rem] rounded-full shrink-0 ${config.barColor}`} aria-hidden="true" />

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center min-w-0">
        <div className="col-span-12 md:col-span-4 min-w-0">
          <div className="flex items-start gap-3">
            <PlatformIcon platform={platform} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2 flex-wrap">
                <p className="font-semibold text-text-primary leading-snug truncate">{title}</p>
                <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${config.badgeClass}`}>
                  {displayStatusTag}
                </span>
              </div>
              <p className="text-sm text-text-muted mt-0.5 font-mono">{displayId}</p>
              <p className="text-sm text-text-secondary mt-1 truncate">
                {customer 
                  ? `${customer} • Menunggu ${waitingTime}` 
                  : updatedAt 
                    ? `Diperbarui ${new Date(updatedAt).toLocaleDateString('id-ID')}`
                    : ""
                }
              </p>
            </div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-5 min-w-0">
          <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">{displayDescription}</p>
          {/* Show next action if available (new human-centric mode) */}
          {!isLegacyMode && nextAction && (
            <p className="text-sm text-text-primary mt-2 font-medium">
              Berikutnya: {nextAction.label}
            </p>
          )}
        </div>

        <div className="col-span-12 md:col-span-3 flex items-center gap-3 md:justify-end">
          {sla && (
            <div className="flex-1 md:max-w-[10rem] md:flex-shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-text-muted font-medium">{sla.label}</p>
                <p className="text-xs font-semibold text-text-secondary">{sla.percentage}%</p>
              </div>
              <div className="w-full bg-surface-sunken rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    sla.percentage >= 80 ? 'bg-status-success' :
                    sla.percentage >= 50 ? 'bg-status-warning' : 'bg-status-danger'
                  }`}
                  style={{ width: `${sla.percentage}%` }}
                  role="progressbar"
                  aria-valuenow={sla.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          )}
          <span className="shrink-0 text-text-muted group-hover:text-text-primary transition-colors" aria-hidden="true">
            <ChevronRightIcon />
          </span>
        </div>
      </div>
    </div>
  );
}