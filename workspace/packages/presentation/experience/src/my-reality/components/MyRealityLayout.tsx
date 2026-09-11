"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import { createWorkspaceNavigation, type NavigationDescriptor, type NavigationItem } from "@repo/composition/navigation";

interface MyRealityLayoutProps {
  header: ReactNode;
  now?: ReactNode;      // PRIMARY HERO - What matters RIGHT NOW (VF-03: answers "what matters now?")
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
 * - VF-02: Implements UNIFIED NAVIGATION from single source of truth (unified-navigation.ts)
 */
export function MyRealityLayout({
  header,
  now,
  attention,
  active,
  signals,
  companion,
  activity,
  userCapabilities = [],
  productId = "default",
}: MyRealityLayoutProps) {
  // VF-02: Global navigation from unified source - matches human mental model: Reality > Work > Actors > Products
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigation: NavigationDescriptor = createWorkspaceNavigation(productId, userCapabilities);
  const navItems = navigation.items;

  return (
    <div className="min-h-screen bg-surface-background">
      {/* UX-SHELL-001: Sticky Global Navigation Header - same implementation as ProductPreviewShell */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo/Brand - EOS only per PR-VISUAL-001 requirements */}
            <div className="flex items-center">
              <Link href="/my-reality" className="text-xl font-bold text-slate-900 tracking-tight">
                EOS
              </Link>
            </div>

            {/* Desktop Navigation - hidden on mobile */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item: NavigationItem) => {
                // Skip separator items in desktop navigation
                if (item.kind === "separator") return null;
                // Hide items that require capabilities user doesn't have
                if (item.capabilityId && !userCapabilities.includes(item.capabilityId)) return null;
                return (
                  <Link
                    key={item.id}
                    href={item.href || "/"}
                    className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile menu button - visible only on mobile */}
            <button
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-700 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu - only visible when open on mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="container mx-auto px-4 py-4 sm:px-6">
              <nav className="flex flex-col gap-3">
                {navItems.map((item: NavigationItem) => {
                  // Handle separator items in mobile navigation
                  if (item.kind === "separator") {
                    return <hr key={item.id} className="border-slate-200 my-1" />;
                  }
                  // Hide items that require capabilities user doesn't have
                  if (item.capabilityId && !userCapabilities.includes(item.capabilityId)) return null;
                  return (
                    <Link
                      key={item.id}
                      href={item.href || "/"}
                      className="text-base font-medium text-slate-600 transition hover:text-slate-900"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* RL4-UX-001 fix: proper container constraints with mobile-first padding to prevent horizontal squeeze */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 sm:pb-8">
        {/* Page Header Region - Full width */}
        <header className="mb-8">
          {header}
        </header>

        {/* Main Content Grid - Responsive (RL4-UX-001 fix: proper grid collapse on all viewports) */}
        <div className={`grid grid-cols-1 ${companion ? 'lg:grid-cols-3' : 'grid-cols-1'} gap-6 sm:gap-8`}>
          {/* Main Reality Column - Takes full width on mobile/tablet, 2/3 only on large desktop if companion exists */}
          <main className={`col-span-1 ${companion ? 'lg:col-span-2' : 'lg:col-span-1'} space-y-0`}>
            {/* 1. PRIMARY HERO - Highest visual hierarchy, answers "what matters now?" (VF-03, VF-06) */}
            {now && <section className="mb-8">{now}</section>}
            
            {/* 2. NEEDS ATTENTION - Secondary priority, items requiring immediate action (VF-04) */}
            {attention && <section className="mb-6 bg-red-50/30 border-l-4 border-red-500 rounded-xl p-6 shadow-sm">{attention}</section>}
            
            {/* 3. ACTIVE WORK - Tertiary priority, items currently in progress */}
            {active && <section className="mb-6 bg-blue-50/30 border-l-4 border-blue-500 rounded-xl p-6 shadow-sm">{active}</section>}
            
            {/* 4. REALITY SIGNALS - Lowest priority, recent updates and completed items */}
            {signals && <section className="mb-0 bg-slate-50/50 border-l-4 border-slate-500 rounded-xl p-6 shadow-sm">{signals}</section>}

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
    </div>
  );
}