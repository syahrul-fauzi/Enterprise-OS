"use client";

import React from "react";
import Link from "next/link";
import { Card, Button, PermissionDenied, ErrorState, WorkRealityLoading, EmptyState, Pagination } from "@repo/presentation-ui-system";
import { PriorityWorkList, UXStateAuditDashboard } from "@repo/presentation-features";
import { usePageStates, UXStateComplianceRegistry } from "@repo/presentation-hooks";
// Manually define WorkItemCardProps matching the interface from @repo/presentation-features/src/work/WorkItemCard
export interface WorkItemCardProps {
  workId: string;
  title: string;
  description?: string;
  state: "open" | "in_progress" | "blocked" | "completed";
  platform?: any;
  bottleneck?: any;
  nextAction?: any;
  href?: string;
  updatedAt?: string;
  onClick?: (workId: string) => void;
  id?: string;
  statusTag?: string;
  statusType?: 'support' | 'review' | 'shipping';
  customer?: string;
  waitingTime?: string;
  sla?: {
    label: string;
    percentage: number;
  };
}
import { ProductPreviewShell } from "../product-preview-shell";

export interface WorkspaceDashboardProps {
  readonly productId: string;
  readonly binding: any;
  readonly session: any;
  readonly searchParams: Record<string, string> | null;
  readonly workItems: Array<{
    id: string;
    title: string;
    description?: string;
    status: string;
  }>;
}

export function WorkspaceDashboard({
  productId,
  binding,
  session,
  searchParams,
  workItems = [],
}: WorkspaceDashboardProps) {
  // 1. Permission check - menggunakan shared PermissionDenied component
  if (!session?.user) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <ProductPreviewShell binding={binding} mode="landing" />
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <PermissionDenied
              title="Akses Ditolak"
              description="Anda tidak memiliki izin untuk mengakses workspace. Silakan masuk terlebih dahulu."
              icon="🔒"
              backLabel="Masuk ke Platform"
              onBack={() => window.location.href = `/login?productId=${productId}`}
            />
          </section>
        </div>
      </main>
    );
  }

  // 2. Convert work items to PriorityWorkList format
  const nowItems: WorkItemCardProps[] = workItems
    .filter(item => item.status === "in_progress")
    .map(item => ({
      workId: item.id,
      title: item.title,
      description: item.description,
      state: "in_progress" as const,
      href: `/work/${item.id}`,
      updatedAt: new Date().toISOString(),
    }));

  const nextItems: WorkItemCardProps[] = workItems
    .filter(item => item.status === "open")
    .map(item => ({
      workId: item.id,
      title: item.title,
      description: item.description,
      state: "open" as const,
      href: `/work/${item.id}`,
      updatedAt: new Date().toISOString(),
    }));

  const watchingItems: WorkItemCardProps[] = workItems
    .filter(item => item.status === "completed")
    .map(item => ({
      workId: item.id,
      title: item.title,
      description: item.description,
      state: "completed" as const,
      href: `/work/${item.id}`,
      updatedAt: new Date().toISOString(),
    }));

  // Use shared usePageStates hook for standardized page state management
  const {
    state,
    isLoading,
    hasError,
    setLoading,
    setSuccess,
    setError,
    goToPage,
    getPaginatedData,
  } = usePageStates<WorkItemCardProps[]>({
    initialPageSize: 10,
  });

  // Calculate pagination
  const allDisplayItems = [...nowItems, ...nextItems, ...watchingItems];
  
  // Initialize with success state if we have data
  if (state.status === "idle" && workItems.length > 0) {
    setSuccess(allDisplayItems, allDisplayItems.length);
  } else if (state.status === "idle" && workItems.length === 0) {
    // If no work items, set empty state
    setEmpty();
  }

  // Get paginated data from the hook
  const paginatedItems = getPaginatedData(allDisplayItems);
  const { currentPage, totalPages } = state.pagination;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Product Preview Shell with session - maintains golden spine */}
        <ProductPreviewShell 
          binding={binding} 
          mode="landing"
        />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Ruang Kerja Anda
              </h1>
              <p className="mt-2 text-slate-600">
                Pantau semua pekerjaan yang membutuhkan perhatian Anda dalam satu tempat.
              </p>
            </div>
            <Link 
              href="/work/new"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Buat Pekerjaan Baru
            </Link>
          </div>

          {/* Error state - using hook's hasError */}
          {hasError && (
            <ErrorState
              title="Terjadi kesalahan"
              description={state.error || "Terjadi kesalahan yang tidak diketahui"}
              onRetry={() => setError(null)}
              className="mb-6"
            />
          )}

          {/* Loading state - using hook's isLoading */}
          {isLoading && (
            <div className="grid gap-3 md:grid-cols-3 mb-6">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pekerjaan Aktif</div>
                <WorkRealityLoading size="sm" className="mt-2" />
              </section>
              <section className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Menunggu</div>
                <WorkRealityLoading size="sm" className="mt-2" />
              </section>
              <section className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selesai</div>
                <WorkRealityLoading size="sm" className="mt-2" />
              </section>
            </div>
          )}

          {/* Empty state - using hook's showEmptyState */}
          {state.showEmptyState && (
            <EmptyState
              title="Belum ada pekerjaan"
              description="Mulailah dengan membuat pekerjaan pertama Anda. Semua kebutuhan yang ingin Anda selesaikan dapat dilacak dari awal hingga selesai di EOS."
              icon="📋"
              primaryActionLabel="Buat Pekerjaan Pertama"
              onPrimaryAction={() => window.location.href = "/work/new"}
              className="py-16 border border-dashed border-slate-200 rounded-2xl"
            />
          )}

          {/* Work list with pagination */}
          {!isLoading && workItems.length > 0 && (
            <>
              <PriorityWorkList 
                now={nowItems.slice(0, 5)} 
                next={nextItems.slice(0, 5)} 
                watching={watchingItems.slice(0, 5)}
                onViewAll={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
              />
              
              {/* Pagination controls - implements pagination visual state using hook's goToPage */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={allDisplayItems.length}
                  itemsPerPage={10}
                  onPageChange={goToPage}
                  className="mt-8 border-t border-slate-200 pt-6"
                  labels={{
                    previous: "Sebelumnya",
                    next: "Selanjutnya",
                    showing: "Menampilkan {start}-{end} dari {total} pekerjaan",
                  }}
                />
              )}
            </>
          )}

          {/* UX State Audit Dashboard - integrated into main workspace dashboard for compliance monitoring */}
          <div className="mt-12">
            <UXStateAuditDashboard />
          </div>
        </section>
      </div>
    </main>
  );
}