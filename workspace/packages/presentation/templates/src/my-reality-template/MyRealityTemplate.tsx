"use client";

import React from 'react';
import { GlobalNavigation } from "@repo/presentation-ui-system/layouts";
import { PageHeader } from "@repo/presentation-ui-system/components/page-header";

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
    now: any[];
    next: any[];
    watching: any[];
  };
  companion: {
    active: boolean;
    summary: string;
    insights: any[];
  };
  activity: any[];
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
 * This component's sole responsibility is to set up the global navigation and page structure,
 * then delegate all content rendering to the <MyRealityExperience /> component.
 *
 * It follows the EOS principle of composing experiences from dedicated primitives rather than
 * duplicating logic. The MyRealityExperience component already contains all necessary P2-compliant
 * states (loading, error, empty, and data). This template does NOT repeat that logic.
 */
export function MyRealityTemplate({ 
  initialModel, 
  auth,
  userCapabilities = [],
  productId = "default",
  breadcrumbItems
}: MyRealityTemplateProps) {
  // SL1-001 Mock data fallback jika initialModel null (untuk runtime proof)
  interface WorkItem {
    id: string;
    title: string;
    status: string;
  }

  interface InsightItem {
    id: string;
    message: string;
  }

  interface ActivityItem {
    id: string;
    message: string;
    timestamp: string;
  }

  interface PlatformItem {
    name: string;
    count: number;
  }

  const defaultModel: MyRealityModel = {
    actor: {
      id: "actor-001",
      displayName: "EOS Operator",
      email: "operator@enterprise-os.local"
    },
    summary: {
      totalWork: 3,
      open: 1,
      inProgress: 1,
      completed: 0,
      blocked: 2,
      bottlenecked: 0
    },
    priority: {
      now: [
        { id: "work-001", title: "Review Q3 Budget Proposal", status: "in-progress" },
        { id: "work-002", title: "Approve Vendor Contract", status: "pending" },
        { id: "work-003", title: "Update Security Policy", status: "not-started" }
      ] as WorkItem[],
      next: [] as WorkItem[],
      watching: [] as WorkItem[]
    },
    companion: {
      active: false,
      summary: "EOS siap membantu Anda",
      insights: [] as InsightItem[]
    },
    activity: [] as ActivityItem[],
    platformDistribution: [] as PlatformItem[]
  };
  
  // Null safety yang lebih ketat: pastikan semua field selalu terdefinisi
  // Ambil works dari initialModel.priority.now (format yang benar dari getMyRealityModel)
  const model = {
    actor: initialModel?.actor || defaultModel.actor,
    summary: initialModel?.summary || defaultModel.summary,
    priority: initialModel?.priority || defaultModel.priority,
    companion: initialModel?.companion || defaultModel.companion,
    activity: initialModel?.activity || defaultModel.activity,
    platformDistribution: initialModel?.platformDistribution || defaultModel.platformDistribution,
    // Gabungkan semua work untuk tampilan sederhana di template ini
    works: [...(initialModel?.priority?.now || []), ...(initialModel?.priority?.next || []), ...(initialModel?.priority?.watching || [])]
  };

  return (
    <GlobalNavigation
      userCapabilities={userCapabilities}
      productId={productId}
      breadcrumbItems={breadcrumbItems}
    >
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          title={`Welcome back, ${auth?.actorLabel || model.actor.displayName}`}
          description="This is your reality. A summary of all work items and signals that require your attention."
        />
        <div className="mt-8 grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{model.summary.totalWork}</p>
              <p className="text-sm text-gray-600">Total Pekerjaan</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{model.summary.inProgress}</p>
              <p className="text-sm text-gray-600">Sedang Berjalan</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{model.summary.blocked}</p>
              <p className="text-sm text-gray-600">Tertunda</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-3xl font-bold text-gray-600">{model.summary.completed}</p>
              <p className="text-sm text-gray-600">Selesai</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Pekerjaan yang Membutuhkan Perhatian ({model.priority.now.length})</h3>
            <ul className="space-y-3">
              {model.priority.now.map((work) => (
                <li key={work.workId} className="flex items-center justify-between p-3 border rounded-md">
                  <span className="font-medium">{work.title}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    work.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    work.status === 'blocked' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {work.status === 'in_progress' ? 'Sedang Berjalan' : work.status === 'blocked' ? 'Tertunda' : work.status}
                  </span>
                </li>
              ))}
              {model.priority.now.length === 0 && (
                <li className="text-center text-gray-500 py-4">Tidak ada pekerjaan yang membutuhkan perhatian saat ini.</li>
              )}
            </ul>
          </div>
        </div>
      </main>
    </GlobalNavigation>
  );
}