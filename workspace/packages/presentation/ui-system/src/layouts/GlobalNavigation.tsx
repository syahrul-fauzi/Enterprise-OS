"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
// Import directly from composition package's source to fix module resolution
import { createWorkspaceNavigation } from "@repo/composition/navigation";
import type { NavigationItem, NavigationDescriptor } from "@repo/composition/navigation";
import type { BreadcrumbItem } from "../molecules/Breadcrumb";
import { Breadcrumb } from "../molecules/Breadcrumb";
import { Select } from "../atoms/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "../molecules/DropdownMenu";
import { LogOut, User, Settings } from "lucide-react";

// Complete icon set for ALL navigation items (matches createWorkspaceNavigation iconNames)
function HomeIcon() {
  return (
    <svg
      className="h-5 w-5 flex-shrink-0"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
      />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg
      className="h-5 w-5 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

// Add missing icon components for all navigation items
function UserGroupIcon() {
  return (
    <svg
      className="h-5 w-5 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg
      className="h-5 w-5 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}



// Import Breadcrumb types explicitly to avoid missing exports
export type { BreadcrumbItem } from "../molecules/Breadcrumb";

export interface GlobalNavigationProps {
  userCapabilities?: string[];
  productId?: string;
  breadcrumbItems?: readonly BreadcrumbItem[];
  children: React.ReactNode;
  isPublic?: boolean;
  auth?: {
    actorLabel?: string;
    actorEmail?: string;
    workspaceId?: string;
    tenantId?: string;
    actorId?: string;
  };
}

// Generate navigation from single source of truth (UX-SHELL-001 compliance)
// We don't hardcode navigation items - use createWorkspaceNavigation instead

// Workspace options for the switcher
const workspaceOptions = [
  { value: "acme-corp", label: "Acme Corp" },
  { value: "pt-kopi-nusantara", label: "PT Kopi Nusantara Mandiri" },
  { value: "eos-demo", label: "EOS Demo Environment" },
];

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
  auth,
}: GlobalNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState("acme-corp");

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/login');
      } else {
        console.error('Logout failed:', response.statusText);
      }
    } catch (error) {
      console.error('An error occurred during logout:', error);
    }
  };
  
  // Generate navigation from single source of truth (single point of failure prevention)
  const workspaceNavigation = createWorkspaceNavigation(productId, userCapabilities);
  
  // Calculate active state dynamically based on current pathname
  const isItemActive = (href?: string) => href && (pathname === href || pathname.startsWith(href + "/"));

  const sidebarWidth = sidebarCollapsed ? "w-16" : "w-60"; // 240px

  return (
    <div className="min-h-screen bg-surface-background text-text-primary">
      {/* ======================================================================== */}
      {/* 1. TOP APP BAR                                                         */}
      {/* ======================================================================== */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-surface-border bg-surface-elevated/95 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-4">
          <button
            className="rounded-md p-2 text-text-muted transition-colors hover:text-text-primary lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle sidebar"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link
            href="/my-reality"
            className="text-xl font-bold tracking-tight text-text-primary focus:outline-none focus:ring-2 focus:ring-status-info focus:ring-offset-2 focus:ring-offset-surface-elevated"
          >
            EOS
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end gap-4">
          {/* Global Search */}
          <div className="hidden w-full max-w-md md:block">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search anything..."
                className="w-full rounded-lg border border-surface-border bg-surface-background py-2 pl-9 pr-4 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              className="relative rounded-md p-2 text-text-muted transition-colors hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-status-info focus:ring-offset-2 focus:ring-offset-surface-elevated"
              aria-label="Notifications"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
              <span className="absolute right-1.5 top-1.5 block h-2 w-2 rounded-full bg-status-error ring-1 ring-surface-elevated"></span>
            </button>

            <div className="h-6 border-l border-surface-border"></div>

            {/* User Avatar & Workspace */}
            <div className="flex items-center gap-3 pl-2">
              <div className="hidden w-40 lg:block">
                <Select
                  value={currentWorkspace}
                  onChange={(e) => setCurrentWorkspace(e.target.value)}
                  options={workspaceOptions}
                  aria-label="Switch Workspace"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-elevated focus:ring-status-info rounded-lg">
                    <img
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=32&h=32"
                      alt="User avatar"
                      className="h-8 w-8 rounded-lg border border-surface-border object-cover"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{auth?.actorLabel || 'EOS User'}</p>
                      <p className="text-xs leading-none text-text-muted">{auth?.actorEmail || 'user@eos.example'}</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => router.push('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => router.push('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ======================================================================== */}
        {/* 2. LEFT SIDEBAR                                                        */}
        {/* ======================================================================== */}
        <aside
          className={`fixed left-0 top-16 z-20 hidden h-[calc(100vh-4rem)] border-r border-surface-border bg-surface-elevated transition-all duration-300 ease-in-out lg:block ${sidebarWidth} overflow-hidden`}
        >
          <div className="flex h-full flex-col justify-between p-3">
            <div className="space-y-6">
              {/* HOME Section */}
              <div>
                <h3
                  className={`px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-text-muted ${
                    sidebarCollapsed ? "text-center" : ""
                  }`}
                >
                  {sidebarCollapsed ? "H" : "Home"}
                </h3>
                <nav className="space-y-1">
                  {workspaceNavigation.items.filter(item => item.kind !== "separator").map((item) => (
                    <Link
                      key={item.id}
                      href={item.href || "/my-reality"}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isItemActive(item.href)
                          ? "bg-status-info/10 text-status-info dark:bg-status-info/20 dark:text-status-info"
                          : "text-text-muted hover:bg-surface-background hover:text-text-primary"
                      } ${sidebarCollapsed ? "justify-center" : ""}`}
                    >
                      {/* Render mapped icon from item.iconName - complete set */}
                       {item.iconName === "home" && <HomeIcon />}
                       {item.iconName === "briefcase" && <BriefcaseIcon />}
                       {item.iconName === "users" && <UserGroupIcon />}
                       {item.iconName === "cube" && <CubeIcon />}
                      {!sidebarCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            {/* Collapse Button */}
            <div>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-background hover:text-text-primary"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <svg
                  className={`h-5 w-5 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {!sidebarCollapsed && <span>Collapse</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Drawer */}
        <div
          className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-in-out lg:hidden ${
            mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />
        <aside
          className={`fixed left-0 top-0 z-50 h-full w-64 border-r border-surface-border bg-surface-elevated transition-transform duration-300 ease-in-out lg:hidden ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-16 items-center border-b border-surface-border px-4">
            <Link href="/my-reality" className="text-xl font-bold tracking-tight text-text-primary">
              EOS
            </Link>
          </div>
          <div className="p-3">
            {/* Mobile navigation sections - use same workspaceNavigation for consistency */}
            <div>
              <h3 className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Home</h3>
              <nav className="space-y-1">
                {workspaceNavigation.items.filter(item => item.kind !== "separator").map((item) => (
                  <Link
                    key={item.id}
                    href={item.href || "/my-reality"}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isItemActive(item.href)
                        ? "bg-status-info/10 text-status-info dark:bg-status-info/20 dark:text-status-info"
                        : "text-text-muted hover:bg-surface-background hover:text-text-primary"
                    }`}
                  >
                    {/* Render mapped icon from item.iconName - complete set */}
                       {item.iconName === "home" && <HomeIcon />}
                       {item.iconName === "briefcase" && <BriefcaseIcon />}
                       {item.iconName === "users" && <UserGroupIcon />}
                       {item.iconName === "cube" && <CubeIcon />}
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        {/* ======================================================================== */}
        {/* 3. MAIN CONTENT                                                        */}
        {/* ======================================================================== */}
        <main className={`w-full flex-1 pt-16 transition-all duration-300 ease-in-out ${!sidebarCollapsed ? "lg:ml-60" : "lg:ml-16"}`}>
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            {breadcrumbItems && breadcrumbItems.length > 0 && (
              <div className="mb-6">
                <Breadcrumb items={breadcrumbItems} />
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}