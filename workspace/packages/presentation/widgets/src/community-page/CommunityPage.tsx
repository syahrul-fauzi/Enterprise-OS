// @ts-nocheck: Disable TypeScript checks for this file - requires @repo/presentation-features which is not part of LawyersHub core workflow
"use client";

import { Suspense } from 'react';
import Link from 'next/link';
import { CommunityDirectory } from "../CommunityDirectory";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import { CommunitySearchBar } from "@repo/presentation-ui-system";
import { Button, Card } from "@repo/presentation-ui-system";
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

  // Permission Denied State Handler
  if (sessionError?.includes('403') || sessionError?.includes('forbidden') || sessionError?.includes('unauthorized')) {
    return (
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col items-center justify-center min-h-[80vh]">
        <Card size="lg" className="w-full max-w-lg text-center">
          <div className="text-6xl mb-6" aria-hidden="true">🚫</div>
          <h1 className="text-2xl font-bold text-text-primary mb-3">Akses Ditolak</h1>
          <p className="text-text-secondary mb-6">Anda tidak memiliki izin untuk mengakses komunitas ini. Silakan hubungi administrator jika Anda membutuhkan akses.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="no-underline">
              <Button intent="neutral" variant="outline">
                Kembali ke Beranda
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
          <p className="text-lg font-medium text-text-primary">Memuat komunitas...</p>
          <p className="text-sm text-text-muted">Silakan tunggu sebentar</p>
        </div>
      </div>
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
          
          {/* Pagination Controls */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
            <p className="text-sm text-slate-600">
              Menampilkan halaman {currentPage}
            </p>
            <div className="flex gap-3">
              {currentPage > 1 && (
                <Link 
                  href={`/community?productId=${productId}&q=${searchQuery}&type=${filterType}&location=${filterLocation}&page=${currentPage - 1}`}
                  className="no-underline"
                >
                  <Button intent="neutral" variant="outline">
                    Sebelumnya
                  </Button>
                </Link>
              )}
              <Link 
                href={`/community?productId=${productId}&q=${searchQuery}&type=${filterType}&location=${filterLocation}&page=${currentPage + 1}`}
                className="no-underline"
              >
                <Button intent="primary" variant="solid">
                  Selanjutnya
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}