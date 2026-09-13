"use client";
import { useState } from "react";
import Link from "next/link";
// Import directly from composition package's source to fix module resolution
import { createWorkspaceNavigation } from "@repo/composition/navigation";
import type { NavigationItem, NavigationDescriptor } from "@repo/composition/navigation";
import type { BreadcrumbItem } from "../molecules/Breadcrumb";
import { Breadcrumb } from "../molecules/Breadcrumb";

// Import Breadcrumb types explicitly to avoid missing exports
export type { BreadcrumbItem } from "../molecules/Breadcrumb";

export interface GlobalNavigationProps {
  userCapabilities?: string[];
  productId?: string;
  breadcrumbItems?: readonly BreadcrumbItem[];
  children: React.ReactNode;
  isPublic?: boolean;
}

/**
 * Global shared navigation component extracted from MyRealityLayout and WorkRealitySurface
 * Implements UX-SHELL-001: Sticky Global Navigation Header with desktop/mobile support
 * Reused across all route groups to eliminate duplicate navigation code
 */
export function GlobalNavigation({
  userCapabilities = [],
  productId = "default",
  breadcrumbItems,
  children,
  isPublic = false,
}: GlobalNavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigation: NavigationDescriptor = createWorkspaceNavigation(productId, userCapabilities);
  const navItems: readonly NavigationItem[] = navigation.items;

  return (
    <div className="min-h-screen bg-surface-background">
      <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-surface-elevated/95 backdrop-blur supports-[backdrop-filter]:bg-surface-elevated/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link
                href="/my-reality"
                className="text-xl font-bold text-text-primary tracking-tight focus:outline-none focus:ring-2 focus:ring-status-info focus:ring-offset-2 rounded transition-colors"
              >
                EOS
              </Link>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => {
                if (item.kind === "separator") return null;
                if (item.capabilityId && !userCapabilities.includes(item.capabilityId)) return null;
                return (
                  <Link
                    key={item.id}
                    href={item.href || "/"}
                    className="text-sm font-medium text-text-muted transition hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-status-info focus:ring-offset-2 rounded px-2 py-1 -mx-2"
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <button
              className="inline-flex items-center justify-center rounded-md p-2 text-text-primary md:hidden focus:outline-none focus:ring-2 focus:ring-status-info focus:ring-offset-2"
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 12h18M3 6h18M3 18h18"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-surface-border bg-surface-elevated">
            <div className="container mx-auto px-4 py-4 sm:px-6">
              <nav className="flex flex-col gap-3">
                {navItems.map((item) => {
                  if (item.kind === "separator") {
                    return <hr key={item.id} className="border-surface-border my-1" />;
                  }
                  if (item.capabilityId && !userCapabilities.includes(item.capabilityId)) return null;
                  return (
                    <Link
                      key={item.id}
                      href={item.href || "/"}
                      className="text-base font-medium text-text-muted transition hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-status-info focus:ring-offset-2 rounded px-2 py-1 -mx-2"
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
      <main>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {breadcrumbItems && breadcrumbItems.length > 0 && (
            <Breadcrumb items={breadcrumbItems} className="mb-6" />
          )}
          {children}
        </div>
      </main>
    </div>
  );
}