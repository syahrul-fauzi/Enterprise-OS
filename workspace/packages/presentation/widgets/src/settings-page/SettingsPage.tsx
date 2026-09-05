"use client";

import React from "react";
import Link from "next/link";
import { ProductPreviewShell } from "../product-preview-shell/index.js";
import type { ProductPreviewBinding, ProductExperience } from "@repo/presentation-experience";
import { getProductExperience } from "@repo/presentation-experience";
import { useWorkspaceSession } from "@repo/presentation-hooks";
import { ProfileTab } from "./tabs/ProfileTab.js";
import { SecurityTab } from "./tabs/SecurityTab.js";
import { SessionTab } from "./tabs/SessionTab.js";
import { PreferencesTab } from "./tabs/PreferencesTab.js";
import { NotificationsTab } from "./tabs/NotificationsTab.js";
import { WorkRealityLoading, EmptyState, ErrorState } from "@repo/presentation-ui-system";

export interface SettingsPageProps {
  readonly session: {
    readonly userId: string;
    readonly actorId: string;
    readonly id: string; // Current session ID - required by SessionTab
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly productId: string;
    readonly actorLabel: string;
  };
  readonly productId: string;
  readonly binding: ProductPreviewBinding;
  readonly activeTab: "profile" | "account" | "preferences" | "notifications" | "security" | "session";
}

const TABS = [
  { id: "profile", label: "Profile", component: ProfileTab },
  { id: "account", label: "Account", component: ProfileTab }, // Reuses profile edit UI
  { id: "preferences", label: "Preferences", component: PreferencesTab },
  { id: "notifications", label: "Notifications", component: NotificationsTab },
  { id: "security", label: "Security", component: SecurityTab },
  { id: "session", label: "Sessions", component: SessionTab },
] as const;

export function SettingsPage({ session, productId, binding, activeTab }: SettingsPageProps) {
  const { loading, authenticated, error: sessionError } = useWorkspaceSession();
  const experience: ProductExperience | undefined = getProductExperience(productId);
  const [activeTabState, setActiveTabState] = React.useState(activeTab);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState<string | null>(null);

  // 1. Permission denied / unauthenticated state - pertama dicek sesuai standar UX
  if (!authenticated) {
    return (
      <ProductPreviewShell binding={binding} mode="landing">
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-sm text-center">
              <EmptyState
                icon="🔒"
                title="Anda belum masuk"
                description="Silakan masuk terlebih dahulu untuk mengakses pengaturan akun."
                actionLabel="Masuk ke Workspace"
                onAction={() => window.location.href = "/enter"}
              />
            </div>
          </div>
        </main>
      </ProductPreviewShell>
    );
  }

  // 2. Session loading state - menggunakan shared WorkRealityLoading component
  if (loading) {
    return (
      <ProductPreviewShell binding={binding} mode="landing">
        <WorkRealityLoading />
      </ProductPreviewShell>
    );
  }

  // 3. Session error state - menggunakan shared ErrorState component
  if (sessionError) {
    return (
      <ProductPreviewShell binding={binding} mode="landing">
        <main className="min-h-screen bg-slate-50 px-6 py-10">
          <div className="mx-auto max-w-5xl space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <ErrorState
                icon="⚠️"
                title="Gagal memuat data"
                description={sessionError}
                retryLabel="Muat Ulang"
                onRetry={() => window.location.reload()}
                fatal={false}
              />
            </section>
          </div>
        </main>
      </ProductPreviewShell>
    );
  }

  // Find the active tab component
  const currentTab = TABS.find(tab => tab.id === activeTabState) || TABS[0];
  const TabComponent = currentTab.component;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <ProductPreviewShell binding={binding} mode="landing" />
        
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="mt-2 text-slate-600">Manage your account, preferences, and security settings.</p>
            {/* Error state untuk tab saving */}
            {isSaving && (
              <div className="mt-4 rounded-lg bg-blue-50 p-4 text-blue-800 border border-blue-200">
                Menyimpan perubahan...
              </div>
            )}
            {/* Success state - sudah ada, disesuaikan urutan */}
            {saveSuccess && (
              <div className="mt-4 rounded-lg bg-emerald-50 p-4 text-emerald-800 border border-emerald-200">
                {saveSuccess}
              </div>
            )}
          </div>

          {/* Tab navigation */}
          <div className="mb-8 border-b border-slate-200">
            <nav className="flex space-x-8 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTabState(tab.id as typeof activeTabState);
                    setSaveSuccess(null);
                  }}
                  className={`whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-medium transition-colors ${
                    activeTabState === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          <div className="max-w-2xl">
            <TabComponent 
              session={session} 
              isSaving={isSaving}
              setIsSaving={setIsSaving}
              setSaveSuccess={setSaveSuccess}
            />
          </div>
        </section>
      </div>
    </main>
  );
}