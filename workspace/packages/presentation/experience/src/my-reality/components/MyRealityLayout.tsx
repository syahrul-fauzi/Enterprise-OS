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
      <div className="max-w-7xl mx-auto px-6 py-6 sm:py-8 pb-40 sm:pb-44">
        {/* Header Region - Full width */}
        <header className="mb-8">
          {header}
        </header>

        {/* Main Content Grid - Responsive */}
        <div className={`grid grid-cols-1 ${companion ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-8`}>
          {/* Main Reality Column - Takes full width if no companion, 2/3 if companion exists */}
          <main className={`${companion ? 'lg:col-span-2' : 'lg:col-span-1'} space-y-0`}>
            {/* 1. SEKARANG (NOW) - PRIMARY CONTENT FIRST, highest visual hierarchy */}
            {now && <section className="mb-8">{now}</section>}
            
            {/* 2. BERIKUTNYA (NEXT) - Secondary content */}
            {next && <section className="mb-8">{next}</section>}
            
            {/* 3. MEMANTAU (WATCHING) - Tertiary content */}
            {watching && <section className="mb-8">{watching}</section>}

            {/* Activity Feed - Only rendered if provided */}
            {activity && (
              <section>{activity}</section>
            )}
          </main>

          {/* Companion Sidebar - Only renders if there are insights (never empty UI) */}
          {companion && (
            <aside className="lg:col-span-1">
              <div className="sticky top-6">
                {companion}
              </div>
            </aside>
          )}
        </div>

        {/* Fixed notification widget - Inside container, safe inset aware, prevents collision with all content */}
        <a 
          href="/notifications" 
          className="fixed bottom-8 left-8 w-14 h-14 sm:w-16 sm:h-16 bg-surface-elevated/95 text-text-primary rounded-full flex items-center justify-center shadow-token-xl ring-1 ring-surface-border backdrop-blur-md hover:bg-surface hover:scale-[1.03] active:scale-[0.98] transition-all duration-eos-standard z-50 focus:outline-none focus:ring-4 focus:ring-status-info/50"
          aria-label="Notifikasi baru"
          aria-roledescription="Tombol notifikasi mengambang"
          style={{ 
            margin: '0', 
            left: 'max(32px, env(safe-area-inset-left))', 
            bottom: 'max(32px, env(safe-area-inset-bottom))' 
          }}>
          <span className="font-black text-lg sm:text-xl tracking-tight" aria-hidden="false">N</span>
        </a>
      </div>
    </div>
  );
}