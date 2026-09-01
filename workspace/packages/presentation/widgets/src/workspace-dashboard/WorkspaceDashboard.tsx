"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, Button } from "@repo/presentation-ui-system";
import { PriorityWorkList } from "@repo/presentation-features";
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
  // 1. Permission check - only authenticated users can access workspace
  if (!session?.user) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <ProductPreviewShell binding={binding} mode="landing" />
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
              <h1 className="text-2xl font-bold text-slate-900">Akses Ditolak</h1>
              <p className="mt-2 text-slate-600">Anda tidak memiliki izin untuk mengakses workspace. Silakan masuk terlebih dahulu.</p>
              <Link 
                href={`/login?productId=${productId}`}
                className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Masuk ke Platform
              </Link>
            </div>
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

  // Local loading state for async operations
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate pagination
  const allDisplayItems = [...nowItems, ...nextItems, ...watchingItems];
  const totalPages = Math.ceil(allDisplayItems.length / itemsPerPage);
  const paginatedItems = allDisplayItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

          {/* Error state */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 mb-6">
              <div className="font-semibold">Terjadi kesalahan</div>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="grid gap-3 md:grid-cols-3 mb-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pekerjaan Aktif</div>
                <div className="mt-2 h-5 w-3/4 animate-pulse rounded-md bg-slate-200"></div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Menunggu</div>
                <div className="mt-2 h-5 w-3/4 animate-pulse rounded-md bg-slate-200"></div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selesai</div>
                <div className="mt-2 h-5 w-3/4 animate-pulse rounded-md bg-slate-200"></div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && workItems.length === 0 && (
            <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl">
              <div className="mx-auto h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Belum ada pekerjaan</h3>
              <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                Mulailah dengan membuat pekerjaan pertama Anda. Semua kebutuhan yang ingin Anda selesaikan dapat dilacak dari awal hingga selesai di EOS.
              </p>
              <Link href="/work/new" className="mt-6 inline-block">
                <Button intent="primary" variant="solid">Buat Pekerjaan Pertama</Button>
              </Link>
            </div>
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
              
              {/* Pagination controls - implements pagination visual state */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
                  <p className="text-sm text-slate-600">
                    Menampilkan {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, allDisplayItems.length)} dari {allDisplayItems.length} pekerjaan
                  </p>
                  <div className="flex gap-2">
                    <button 
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded border border-slate-200 text-slate-400 cursor-not-allowed disabled:opacity-50"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    >
                      Sebelumnya
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        className={`px-3 py-1 rounded border ${page === currentPage ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button 
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded border border-slate-200 text-slate-400 cursor-not-allowed disabled:opacity-50"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}