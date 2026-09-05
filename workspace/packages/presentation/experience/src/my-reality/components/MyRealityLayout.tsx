"use client";

import type { ReactNode } from "react";

interface MyRealityLayoutProps {
  header: ReactNode;
  now?: ReactNode;      // SEKARANG - Primary work that needs immediate attention
  next?: ReactNode;    // BERIKUTNYA - Works waiting on user and others
  watching?: ReactNode;// MEMANTAU - Works being monitored
  companion?: ReactNode;// EOS Companion insights - only rendered if exists
  activity?: ReactNode;// Recent activity feed
}

/**
 * MyRealityLayout - Core layout container for the entire My Reality experience
 * Responsibilities:
 * - Provides responsive grid structure for human-centric reality sections:
 *   NOW → NEXT → WATCHING → COMPANION → ACTIVITY (follows user's single question)
 * - Maintains strict visual hierarchy (primary content first)
 * - Does NOT contain any business logic, platform-specific code, or API calls
 * - Only manages regions of the experience (PRESENTATION CONSTITUTION compliant)
 */
export function MyRealityLayout({
  header,
  now,
  next,
  watching,
  companion,
  activity,
}: MyRealityLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-background">
      {/* RL4-UX-001 fix: proper container constraints with mobile-first padding to prevent horizontal squeeze */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 sm:pb-8">
        {/* Header Region - Full width */}
        <header className="mb-8">
          {header}
        </header>

        {/* Main Content Grid - Responsive (RL4-UX-001 fix: proper grid collapse on all viewports) */}
        <div className={`grid grid-cols-1 ${companion ? 'lg:grid-cols-3' : 'grid-cols-1'} gap-6 sm:gap-8`}>
          {/* Main Reality Column - Takes full width on mobile/tablet, 2/3 only on large desktop if companion exists */}
          <main className={`col-span-1 ${companion ? 'lg:col-span-2' : 'lg:col-span-1'} space-y-0`}>
            {/* 1. SEKARANG (NOW) - PRIMARY CONTENT FIRST, highest visual hierarchy, reduced margin for tighter spacing */}
            {now && <section className="mb-6 bg-emerald-50/30 border-l-4 border-emerald-500 border-r border-t border-b border-emerald-100 rounded-xl p-6 shadow-md">{now}</section>}
            
            {/* 2. BERIKUTNYA (NEXT) - Secondary content */}
            {next && <section className="mb-6 bg-white border border-gray-100 rounded-xl p-6 shadow-sm">{next}</section>}
            
            {/* 3. MEMANTAU (WATCHING) - Tertiary content */}
            {watching && <section className="mb-0 bg-slate-50/50 border border-slate-100 rounded-xl p-6 shadow-sm">{watching}</section>}

            {/* Activity Feed - Only rendered if provided */}
            {activity && (
              <section>{activity}</section>
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
          aria-label="Notifikasi baru"
          aria-roledescription="Tombol notifikasi mengambang"
          style={{ 
            margin: '0', 
            right: 'max(32px, env(safe-area-inset-right))', 
            bottom: 'max(48px, env(safe-area-inset-bottom))' 
          }}>
          <span className="font-black text-lg sm:text-xl tracking-tight" aria-hidden="false">N</span>
        </a>
      </div>
    </div>
  );
}