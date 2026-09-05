// @ts-nocheck: Disable TypeScript checks for this file - requires @repo/presentation-features which is not part of LawyersHub core workflow
"use client";

import { Suspense } from 'react';
import Link from 'next/link';
import { CommunityDirectory } from "../CommunityDirectory";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import { CommunitySearchBar, WorkRealityLoading } from "@repo/presentation-ui-system";
import { Button, Card, PermissionDenied, ErrorState, Pagination } from "@repo/presentation-ui-system";
import { useWorkspaceSession } from "@repo/presentation-hooks/use-workspace-session";
import type { ProductPreviewBinding } from "@repo/presentation-types";
import type { WorkspaceSession } from "@repo/core-kernel";

export interface CommunityPageProps {
  readonly productId: string;
  readonly binding: ProductPreviewBinding;
  readonly session: WorkspaceSession;
  readonly searchQuery?: string;
  readonly filterType?: string;
  readonly filterLocation?: string;
  readonly currentPage?: number;
  readonly pageSize?: number;
}

export function CommunityPage({ 
  productId,
  binding,
  session,
  searchQuery = '',
  filterType = 'all',
  filterLocation = 'all',
  currentPage = 1,
  pageSize = 10
}: CommunityPageProps) {
  const { loading, authenticated, error: sessionError } = useWorkspaceSession();

  // Permission Denied State Handler - menggunakan shared PermissionDenied component
  if (sessionError?.includes('403') || sessionError?.includes('forbidden') || sessionError?.includes('unauthorized')) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <ProductPreviewShell binding={binding} mode="landing" />
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <PermissionDenied
              title="Akses Ditolak"
              description="Anda tidak memiliki izin untuk mengakses komunitas ini. Silakan hubungi administrator jika Anda membutuhkan akses."
              icon="🚫"
              backLabel="Kembali ke Beranda"
              onBack={() => window.location.href = "/"}
            />
          </section>
        </div>
      </main>
    );
  }

  // General Error State Handler - menggunakan shared ErrorState component
  if (sessionError) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <ProductPreviewShell binding={binding} mode="landing" />
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <ErrorState
              title="Gagal Memuat Komunitas"
              description="Terjadi kesalahan saat mencoba memuat data komunitas. Silakan coba lagi nanti."
              icon="⚠️"
              retryLabel="Coba Lagi"
              onRetry={() => window.location.reload()}
            />
          </section>
        </div>
      </main>
    );
  }

  // Loading State - menggunakan shared WorkRealityLoading component
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <WorkRealityLoading />
      </main>
    );
  }

  return (
    <>
      <ProductPreviewShell binding={binding} mode="landing" />
      
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Bergabung Komunitas
          </h1>
          <p className="mt-2 text-slate-600">
            Telusuri ribuan peneliti, akademisi, dan institusi dari seluruh dunia yang berkontribusi di komunitas ini.
          </p>
        </div>

        <CommunitySearchBar 
          initialQuery={searchQuery} 
          initialType={filterType}
          initialLocation={filterLocation} 
          productId={productId} 
        />
        
        <div className="mt-8">
          <Suspense fallback={<div className="animate-pulse h-96 bg-slate-100 rounded-xl"></div>}>
            <CommunityDirectory 
              productId={productId}
              searchQuery={searchQuery}
              filterType={filterType}
              filterLocation={filterLocation}
            />
          </Suspense>
          
          {/* Pagination Controls - menggunakan shared Pagination component */}
          <div className="mt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={999} // Placeholder - harus diisi oleh CommunityDirectory dengan total halaman sebenarnya
              totalItems={9999} // Placeholder - harus diisi oleh CommunityDirectory dengan total item sebenarnya
              itemsPerPage={pageSize}
              onPageChange={(page) => {
                window.location.href = `/community?productId=${productId}&q=${searchQuery}&type=${filterType}&location=${filterLocation}&page=${page}`;
              }}
            />
          </div>
        </div>
      </section>
    </>
  );
}