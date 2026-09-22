"use client";

import React from "react";
import Link from "next/link";
import { ProductPreviewShell } from "../product-preview-shell";
import type { ProductPreviewBinding, ProductExperience } from "@repo/presentation-experience";
import { getProductExperience } from "@repo/presentation-experience";
import { useWorkspaceSession } from "@repo/presentation-hooks";
// Simplified SettingsPage with only basic tabs for golden spine v0.1
// Removed complex tab dependencies to unblock build
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
    readonly userCapabilities?: string[];
  };
  readonly productId: string;
  readonly binding: ProductPreviewBinding;
  readonly activeTab: "profile" | "account" | "preferences" | "notifications" | "security" | "session" | "governance";
}

// Governance tab component - minimal implementation to connect DeliveryDecisionGatewayService
function GovernanceTab() {
  const [decisions, setDecisions] = React.useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    requirementId: "",
    decisionType: "delivery_approval",
    decision: "approve",
    rationale: ""
  });

  // Load existing decisions on mount
  React.useEffect(() => {
    const loadDecisions = async () => {
      try {
        const res = await fetch(`/api/governance/decisions?productId=default`);
        if (res.ok) {
          const data = await res.json();
          setDecisions(data.decisions || []);
        }
      } catch (error) {
        console.error("Failed to load governance decisions:", error);
      }
    };
    loadDecisions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/governance/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const newDecision = await res.json();
        setDecisions(prev => [newDecision, ...prev]);
        setFormData({ requirementId: "", decisionType: "delivery_approval", decision: "approve", rationale: "" });
      }
    } catch (error) {
      console.error("Failed to submit decision:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Decision submission form */}
      <form onSubmit={handleSubmit} className="space-y-6 p-6 border border-slate-200 rounded-xl bg-white">
        <h3 className="text-lg font-semibold text-slate-900">Submit Governance Decision</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Requirement ID</label>
            <input
              type="text"
              value={formData.requirementId}
              onChange={(e) => setFormData({...formData, requirementId: e.target.value})}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="req-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Decision Type</label>
            <select
              value={formData.decisionType}
              onChange={(e) => setFormData({...formData, decisionType: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="delivery_approval">Delivery Approval</option>
              <option value="delivery_review">Delivery Review</option>
              <option value="escalation">Escalation</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Decision</label>
            <select
              value={formData.decision}
              onChange={(e) => setFormData({...formData, decision: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
              <option value="request_changes">Request Changes</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Rationale</label>
          <textarea
            value={formData.rationale}
            onChange={(e) => setFormData({...formData, rationale: e.target.value})}
            required
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Explain the rationale for this decision..."
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Submit Decision"}
        </button>
      </form>

      {/* Decision history */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Decision History</h3>
        {decisions.length === 0 ? (
          <div className="p-6 text-center border border-slate-200 rounded-xl bg-slate-50">
            <p className="text-slate-500">No governance decisions yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {decisions.map((decision) => (
              <div key={decision.decision_id} className="p-4 border border-slate-200 rounded-xl bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{decision.requirement_id}</p>
                    <p className="text-sm text-slate-600">{decision.actor.label} • {new Date(decision.timestamp_utc).toLocaleString()}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    decision.decision === "approve" ? "bg-emerald-100 text-emerald-800" :
                    decision.decision === "reject" ? "bg-red-100 text-red-800" :
                    "bg-amber-100 text-amber-800"
                  }`}>
                    {decision.decision}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{decision.rationale}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Simplified tabs for golden spine v0.1 - added governance tab
const TABS = [
  { id: "basic", label: "Basic Settings", component: () => <div>Settings coming soon</div> },
  { id: "governance", label: "Governance", component: GovernanceTab },
] as const;

export function SettingsPage({ session, productId, binding, activeTab }: SettingsPageProps) {
  const { loading, authenticated, error: sessionError } = useWorkspaceSession();
  const experience: ProductExperience | undefined = getProductExperience(productId);
  const [activeTabState, setActiveTabState] = React.useState<typeof TABS[number]['id']>("basic");
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

  // Set initial active tab based on prop if it's governance (from /govern route)
  React.useEffect(() => {
    if (activeTab === "governance") {
      setActiveTabState("governance");
    }
  }, [activeTab]);

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
            <TabComponent />
          </div>
        </section>
      </div>
    </main>
  );
}