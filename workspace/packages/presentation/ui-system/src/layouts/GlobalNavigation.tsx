"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
// Import directly from composition package's source to fix module resolution
import { createWorkspaceNavigation } from "@repo/composition/navigation";
import type { NavigationItem, NavigationDescriptor } from "@repo/composition/navigation";
import type { BreadcrumbItem } from "../molecules/Breadcrumb";
import { Breadcrumb } from "../molecules/Breadcrumb";
import { Select } from "../atoms/input";

// Icon components map to NavigationItem.iconName values - complete set for all navigation items
function HomeIcon() {
  return (
    <svg
      className="h-5 w-5"
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
      className="h-5 w-5"
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

function UsersIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      className="h-5 w-5"
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

function SearchIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
      />
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
}: GlobalNavigationProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState("acme-corp");
  
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
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=32&h=32"
                alt="User avatar"
                className="h-8 w-8 rounded-lg border border-surface-border object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ======================================================================== */}
        {/* 2. LEFT SIDEBAR                                                        */}
        {/* ======================================================================== */}
        <aside
          className={`fixed left-0 top-16 z-20 hidden h-[calc(100vh-4rem)] border-r border-surface-border bg-surface-elevated transition-all duration-300 ease-in-out lg:block ${sidebarWidth}`}
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
                      {/* Render mapped icon from item.iconName */}
                       {item.iconName === "home" && <HomeIcon />}
                       {item.iconName === "briefcase" && <BriefcaseIcon />}
                       {item.iconName === "users" && <UsersIcon />}
                       {item.iconName === "cube" && <CubeIcon />}
                       {item.iconName === "user" && <UserIcon />}
                       {item.iconName === "settings" && <SettingsIcon />}
                       {item.iconName === "inbox" && <InboxIcon />}
                       {item.iconName === "document" && <DocumentIcon />}
                       {item.iconName === "search" && <SearchIcon />}
                       {item.iconName === "server" && <ServerIcon />}
                       {!item.iconName || !["home", "briefcase", "users", "cube", "user", "settings", "inbox", "document", "search", "server"].includes(item.iconName) ? (
                         <div className="h-5 w-5"></div>
                       ) : null}
                      {!sidebarCollapsed && <span>{item.label}</span>}
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
                    {/* Render mapped icon from item.iconName */}
                     {item.iconName === "home" && <HomeIcon />}
                     {item.iconName === "briefcase" && <BriefcaseIcon />}
                     {item.iconName === "users" && <UsersIcon />}
                     {item.iconName === "cube" && <CubeIcon />}
                     {item.iconName === "user" && <UserIcon />}
                     {item.iconName === "settings" && <SettingsIcon />}
                     {item.iconName === "inbox" && <InboxIcon />}
                     {item.iconName === "document" && <DocumentIcon />}
                     {item.iconName === "search" && <SearchIcon />}
                     {item.iconName === "server" && <ServerIcon />}
                     {!item.iconName || !["home", "briefcase", "users", "cube", "user", "settings", "inbox", "document", "search", "server"].includes(item.iconName) ? (
                       <div className="h-5 w-5"></div>
                     ) : null}
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
        <main className={`w-full flex-1 pt-16 transition-all duration-300 ease-in-out lg:${!sidebarCollapsed ? "ml-60" : "ml-16"}`}>
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