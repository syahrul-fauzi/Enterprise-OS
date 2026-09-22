"use client";

import type { ReactNode } from "react";
import { Breadcrumb, type BreadcrumbItem } from "@repo/presentation-ui-system";

interface MyRealityLayoutProps {
  header: ReactNode;
  breadcrumbItems?: readonly BreadcrumbItem[]; // P2: Breadcrumb navigation for work hierarchy (UX-SHELL-002)
  attention?: ReactNode;// NEEDS ATTENTION - All items requiring user action
  active?: ReactNode;   // ACTIVE WORK - Items currently in progress
  signals?: ReactNode;  // REALITY SIGNALS - Recent updates and completed items
  companion?: ReactNode;// EOS Companion insights - only rendered if exists
  activity?: ReactNode;// Recent activity feed
  userCapabilities?: string[]; // VF-02: Pass user capabilities for unified navigation filtering
  productId?: string;   // VF-02: Product ID for workspace navigation
}

/**
 * MyRealityLayout - Core layout container for the entire My Reality experience
 * Responsibilities:
 * - Provides OPERATING ORIENTATION hierarchy: HERO → NEEDS ATTENTION → ACTIVE WORK → REALITY SIGNALS
 * - Maintains strict visual hierarchy per PR-VISUAL-001 requirements
 * - Does NOT contain any business logic, platform-specific code, or API calls
 * - Only manages regions of the experience (PRESENTATION CONSTITUTION compliant)
 * - VF-02: Uses shared GlobalNavigation component from @repo/presentation/ui-system
 * - Eliminates duplicate navigation code, single source of truth for navigation
 */
export function MyRealityLayout({
  header,
  breadcrumbItems,
  attention,
  active,
  signals,
  companion,
  activity,
  userCapabilities = [],
  productId = "default",
}: MyRealityLayoutProps) {
  return (
    <>
      {/* Main content area with preserved MyReality layout structure */}

      {/* RL4-UX-001 fix: proper container constraints with mobile-first padding to prevent horizontal squeeze */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 sm:pb-8">
        {/* P2: Breadcrumb navigation - rendered before page header, only if items provided */}
        {breadcrumbItems && breadcrumbItems.length > 0 && (
          <div className="mb-4">
            <Breadcrumb items={breadcrumbItems} size="sm" />
          </div>
        )}
        {/* Page Header Region - Full width */}
        <header className="mb-8">
          {header}
        </header>

        {/* Main Content Grid - Responsive (RL4-UX-001 fix: proper grid collapse on all viewports) */}
        <div className={`grid grid-cols-1 ${companion ? 'lg:grid-cols-3' : 'grid-cols-1'} gap-6 sm:gap-8`}>
          {/* Main Reality Column - Takes full width on mobile/tablet, 2/3 only on large desktop if companion exists */}
          <main className={`col-span-1 ${companion ? 'lg:col-span-2' : 'lg:col-span-1'} space-y-0`}>
            {/* 1. PRIMARY HERO - Highest visual hierarchy, answers "what matters now?" (VF-03, VF-06) */}

            
            {/* 2. NEEDS ATTENTION - Secondary priority, items requiring immediate action (VF-04) */}
            {attention && <section className="mb-6 bg-surface-critical-subtle border-l-4 border-critical-subtle rounded-xl p-6 shadow-sm">{attention}</section>}
            
            {/* 3. ACTIVE WORK - Tertiary priority, items currently in progress */}
            {active && <section className="mb-6 bg-surface-info-subtle border-l-4 border-info-subtle rounded-xl p-6 shadow-sm">{active}</section>}
            
            {/* 4. REALITY SIGNALS - Lowest priority, recent updates and completed items */}
            {signals && <section className="mb-0 bg-surface-subtle border-l-4 border-neutral-subtle rounded-xl p-6 shadow-sm">{signals}</section>}

            {/* Activity Feed - Only rendered if provided */}
            {activity && (
              <section className="mt-6">{activity}</section>
            )}
          </main>

          {/* Companion Sidebar - Only renders on desktop, full width on mobile/tablet (RL4-UX-001 fix: proper grid collapse) */}
          {companion && (
            <aside className="col-span-1 lg:col-span-1">
              <div className="sticky top-6 mt-6 lg:mt-0">
                {companion}
              </div>
            </aside>
          )}
        </div>

        {/* RL4-UX-001 fix: Updated notification widget with z-index and safe area to prevent action collision */}
        <a 
          href="/notifications" 
          className="fixed bottom-10 right-8 w-14 h-14 sm:w-16 sm:h-16 bg-surface-elevated/95 text-text-primary rounded-full flex items-center justify-center shadow-token-xl ring-1 ring-surface-border backdrop-blur-md hover:bg-surface hover:scale-[1.03] active:scale-[0.98] transition-all duration-eos-standard z-[60] focus:outline-none focus:ring-4 focus:ring-status-info/50"
          aria-label="Notifikasi dan perhatian"
          aria-roledescription="Tombol notifikasi mengambang"
          style={{ 
            margin: '0', 
            right: 'max(32px, env(safe-area-inset-right))', 
            bottom: 'max(48px, env(safe-area-inset-bottom))' 
          }}>
          <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </a>
      </div>
    </>
  );
}