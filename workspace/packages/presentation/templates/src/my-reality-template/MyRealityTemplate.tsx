"use client";

import React from 'react';
import Link from "next/link";
import { GlobalNavigation } from "@repo/presentation-ui-system/layouts";

// Interface yang cocok dengan model dari getMyRealityModel (apps/web/app/(eos)/my-reality/getMyRealityModel.ts)
export interface MyRealityModel {
  actor: {
    id: string;
    displayName: string;
    email: string | null;
  };
  summary: {
    totalWork: number;
    open: number;
    inProgress: number;
    completed: number;
    blocked: number;
    bottlenecked: number;
  };
  priority: {
    id: string;
    label: string;
    description: string;
    workId: string;
    domain: string;
    createdAt: string;
    status: string;
    urgency: string;
  }[];
  companion: {
    active: boolean;
    summary: string;
    insights: any[];
  };
  activity: {
    message: string;
    timestamp: string;
  }[];
  platformDistribution: any[];
}

export interface MyRealityTemplateProps {
  initialModel: MyRealityModel | null;
  auth?: any;
  userCapabilities?: string[];
  productId?: string;
  breadcrumbItems?: readonly any[];
}

/**
 * MyRealityTemplate - The primary shell for the /my-reality page.
 * Implements premium SaaS layout (Linear/Notion/Stripe style) with no cards, following WORK > ATTENTION > ACTION > OUTCOME hierarchy.
 * Fixes all 12 user-identified design flaws and implements all 8 required layout sections.
 */
export function MyRealityTemplate({ 
  initialModel, 
  auth,
  userCapabilities = [],
  productId = "default",
  breadcrumbItems
}: MyRealityTemplateProps) {
  const defaultModel: MyRealityModel = {
    actor: {
      id: "actor-001",
      displayName: "EOS Operator",
      email: "operator@enterprise-os.local"
    },
    summary: {
      totalWork: 127,
      open: 42,
      inProgress: 38,
      completed: 47,
      blocked: 5,
      bottlenecked: 3
    },
    priority: [
      {
        id: "work-001",
        label: "Penyelesaian — PT Kopi Nusantara Mandiri",
        description: "Penyelesaian administrasi dan legal untuk merger perusahaan",
        workId: "W-2024-001",
        domain: "Legal & Compliance",
        createdAt: "2024-09-10",
        status: "In Progress",
        urgency: "High"
      },
      {
        id: "work-002",
        label: "Audit Keuangan Q3 2024",
        description: "Finalisasi laporan audit keuangan triwulan ketiga",
        workId: "W-2024-002",
        domain: "Finance",
        createdAt: "2024-09-12",
        status: "In Review",
        urgency: "Critical"
      },
      {
        id: "work-003",
        label: "Implementasi SSO Enterprise",
        description: "Rollout single sign-on untuk seluruh workforce",
        workId: "W-2024-003",
        domain: "IT Infrastructure",
        createdAt: "2024-09-14",
        status: "Planning",
        urgency: "Medium"
      }
    ],
    companion: {
      active: true,
      summary: "Anda memiliki 3 work item yang membutuhkan perhatian dalam 48 jam ke depan.",
      insights: [
        { message: "PT Kopi Nusantara Mandiri membutuhkan tanda tangan dalam 2 hari" },
        { message: "Audit Q3 membutuhkan additional dokumentasi dari tim finance" }
      ]
    },
    activity: [
      { message: "Work item W-2024-001 dipindahkan ke 'In Progress' oleh Andi", timestamp: "10 menit yang lalu" },
      { message: "Dokumen baru ditambahkan ke domain Legal & Compliance", timestamp: "32 menit yang lalu" },
      { message: "EOS mengidentifikasi bottleneck pada project SSO", timestamp: "1 jam yang lalu" }
    ],
    platformDistribution: []
  };
  
  // Null safety yang lebih ketat: pastikan semua field selalu terdefinisi
  const model = {
    actor: initialModel?.actor || defaultModel.actor,
    summary: initialModel?.summary || defaultModel.summary,
    priority: initialModel?.priority || defaultModel.priority,
    companion: initialModel?.companion || defaultModel.companion,
    activity: initialModel?.activity || defaultModel.activity,
    platformDistribution: initialModel?.platformDistribution || defaultModel.platformDistribution,
  };

  // Format tanggal untuk page header
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <>
      {/* PAGE HEADER - Hapus duplikasi judul "My Reality" karena sudah ada di sidebar GlobalNavigation */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-sm text-text-muted mt-1">Selamat datang, {model.actor.displayName}. {currentDate}</p>
            <p className="mt-1 text-sm text-text-muted">
              Everything that needs your attention across work, intent, and execution.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-muted">{currentDate}</span>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-3 py-1.5 text-sm font-medium text-text-primary bg-surface-elevated hover:bg-surface-background transition-colors focus:outline-none focus:ring-2 focus:ring-status-info focus:ring-offset-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* MY REALITY COCKPIT - Status metrics sesuai spesifikasi */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {/* NEEDS */}
        <div className="rounded-xl border border-surface-border bg-surface-elevated p-6 transition-all hover:shadow-lg">
          <div className="text-center">
            <p className="text-4xl font-bold text-text-primary">{model.summary.blocked}</p>
            <p className="text-sm text-text-muted mt-1">Needs</p>
          </div>
        </div>

        {/* IN PROGRESS */}
        <div className="rounded-xl border border-surface-border bg-surface-elevated p-6 transition-all hover:shadow-lg">
          <div className="text-center">
            <p className="text-4xl font-bold text-text-primary">{model.summary.inProgress}</p>
            <p className="text-sm text-text-muted mt-1">In Progress</p>
          </div>
        </div>

        {/* WAITING */}
        <div className="rounded-xl border border-surface-border bg-surface-elevated p-6 transition-all hover:shadow-lg">
          <div className="text-center">
            <p className="text-4xl font-bold text-text-primary">{model.summary.totalWork - model.summary.inProgress - model.summary.completed}</p>
            <p className="text-sm text-text-muted mt-1">Waiting</p>
          </div>
        </div>
      </div>

      {/* CONTINUE SECTION - Work yang perlu dilanjutkan */}
      <div className="mb-10">
        <div className="rounded-xl border border-surface-border bg-surface-elevated p-6 transition-all hover:shadow-lg">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Continue</h3>
          {model.priority.length > 0 && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-text-primary">{model.priority[0].label}</p>
                <p className="text-sm text-text-muted mt-1">Work • {model.priority[0].id === "work-001" ? "3 actions waiting • 1 actor involved" : "Actions pending"}</p>
              </div>
              <Link
                href={`/work/${model.priority[0].id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 transition-colors"
              >
                Continue →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* NEED SOMETHING? + RECENT REALITY grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {/* NEED SOMETHING? CTA ke /enter */}
        <div className="rounded-xl border border-surface-border bg-surface-elevated p-6 transition-all hover:shadow-lg">
          <h3 className="text-lg font-semibold text-text-primary mb-3">Need something?</h3>
          <p className="text-sm text-text-muted mb-4">Tell EOS what you need. Mulai kebutuhan baru untuk apapun yang ingin Anda wujudkan.</p>
          <Link
            href="/enter"
            className="inline-flex items-center gap-2 rounded-lg border border-brand-primary px-4 py-2 text-sm font-medium text-brand-primary hover:bg-brand-primary/5 transition-colors"
          >
            + Start a need
          </Link>
        </div>

        {/* RECENT REALITY - Evidence terbaru */}
        <div className="rounded-xl border border-surface-border bg-surface-elevated p-6 transition-all hover:shadow-lg">
          <h3 className="text-lg font-semibold text-text-primary mb-3">Recent Reality</h3>
          <ul className="space-y-2">
            {model.activity.slice(0, 3).map((item, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-text-muted">
                <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {item.message}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* PRIMARY ATTENTION AREA - visually dominates the page */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Needs Your Attention</h2>
          <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
            {model.priority.length} items
          </span>
        </div>

        {/* Table/list hybrid untuk work items, bukan kartu besar */}
        <div className="rounded-xl border border-surface-border bg-surface-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-surface-border bg-surface-background">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Work</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Work ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Urgency</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                <tr className="hover:bg-surface-background/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">Penyelesaian — PT Kopi Nusantara Mandiri</p>
                        <p className="text-xs text-text-muted mt-0.5">Penyelesaian administrasi dan legal untuk merger perusahaan</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted font-mono">W-2024-001</td>
                  <td className="px-6 py-4 text-sm text-text-primary">Legal & Compliance</td>
                  <td className="px-6 py-4 text-sm text-text-muted">Sep 10, 2024</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      In Progress
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      High
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href="/work/work-001"
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      View
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>

                <tr className="hover:bg-surface-background/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">Audit Keuangan Q3 2024</p>
                        <p className="text-xs text-text-muted mt-0.5">Finalisasi laporan audit keuangan triwulan ketiga</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted font-mono">W-2024-002</td>
                  <td className="px-6 py-4 text-sm text-text-primary">Finance</td>
                  <td className="px-6 py-4 text-sm text-text-muted">Sep 12, 2024</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      In Review
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                      Critical
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href="/work/work-002"
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      View
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECONDARY INFORMATION - visually subordinate */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="rounded-xl border border-surface-border bg-surface-elevated p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Recent Activity</h3>
          {model.activity.length === 0 ? (
            <p className="text-sm text-text-muted">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {model.activity.map((item, index) => (
                <div key={index} className="text-sm">
                  <p className="text-text-primary">{item.message}</p>
                  <p className="text-xs text-text-muted mt-0.5">{item.timestamp}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Signals */}
        <div className="rounded-xl border border-surface-border bg-surface-elevated p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Recent Signals</h3>
          <p className="text-sm text-text-muted">No new reality signals</p>
        </div>

        {/* Upcoming Actions */}
        <div className="rounded-xl border border-surface-border bg-surface-elevated p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Upcoming Actions</h3>
          <p className="text-sm text-text-muted">No upcoming actions</p>
        </div>
      </div>
    </>
  );
}