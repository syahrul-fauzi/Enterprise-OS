"use client";

import React, { ReactNode } from "react";

interface MyRealityHeaderProps {
  title: string;
  description?: string;
  auth?: any;
  companionState?: {
    active: boolean;
    label: string;
  };
  actions?: ReactNode;
}

/**
 * MyRealityHeader - Top header for the My Reality experience
 * Maintains EOS design principles: calm, operational, contextual
 */
export function MyRealityHeader({
  title,
  description,
  auth,
  companionState,
  actions,
}: MyRealityHeaderProps) {
  const displayName = auth?.actorLabel || 'Pengguna';
  const personalizedTitle = title.includes('Selamat') ? `${title}, ${displayName}` : title;

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="flex-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          {personalizedTitle}
        </h1>
        {description && (
          <p className="mt-2 text-base text-text-secondary max-w-2xl">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {/* "Start New Work" Button - Primary action */}
        <a 
          href="/intent/new" 
          className="px-4 py-2 bg-brand-primary text-white font-medium rounded-lg hover:bg-brand-primary/90 transition-colors shadow-token-sm"
        >
          + Mulai Pekerjaan Baru
        </a>
        
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