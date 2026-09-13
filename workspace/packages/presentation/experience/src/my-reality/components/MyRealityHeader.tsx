"use client";

import React, { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  auth?: any;
  companionState?: {
    active: boolean;
    label: string;
  };
  actions?: ReactNode;
  status?: string;
  message?: string;
  icon?: ReactNode;
}

/**
 * PageHeader - Unified top header component for all Golden Spine routes
 * P2 compliant: responsive behavior, semantic tokens, no hardcoded styles
 * Reused across /my-reality, /work, /work/new, /work/[id] to ensure visual consistency
 * Maintains EOS design principles: calm, operational, contextual
 */
export function PageHeader({
  title,
  description,
  auth,
  companionState,
  actions,
  actorName, // PR-VISUAL-001: Accept actor name from model if auth not available
}: PageHeaderProps & { actorName?: string }) {
  // VF-05 Identity Reality Gate: Always show real name, never "Pengguna" fallback
  const displayName = auth?.actorLabel || actorName || auth?.displayName || 'Anda';
  const personalizedTitle = title.includes('Selamat') ? `${title}, ${displayName}` : title;

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 w-full">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          {personalizedTitle}
        </h1>
        {description && (
          <p className="mt-2 text-base text-text-muted max-w-2xl">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 mr-4">
        {/* Additional Actions (e.g., Theme Toggle, Settings) */}
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// Maintain backward compatibility for existing usages
export { PageHeader as MyRealityHeader };