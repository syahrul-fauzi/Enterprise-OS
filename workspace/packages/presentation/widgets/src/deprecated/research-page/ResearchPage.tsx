"use client";

import React from "react";
import { ProductPreviewShell } from "../../product-preview-shell/ProductPreviewShell";
import { getProductExperience } from "@repo/presentation-experience";
import type { ProductPreviewBinding, ProductExperience } from "@repo/presentation-experience";
import type { Requirement } from "@repo/presentation-entities";
import { ResearchSearchBar, WorkRealityLoading, EmptyState, ErrorState, PermissionDenied, Pagination } from "@repo/presentation-ui-system";
import { ResearchFeed } from "../ResearchFeed";

export interface ResearchPageProps {
  readonly productId: string;
  readonly binding: ProductPreviewBinding;
  readonly searchQuery?: string;
  readonly filterStatus?: string;
  readonly session?: any;
}

export function ResearchPage({ productId, binding, searchQuery = '', filterStatus = 'all', session }: ResearchPageProps) {
  const experience: ProductExperience | undefined = getProductExperience(productId);
  const [filteredResearch, setFilteredResearch] = React.useState<Requirement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // Permission check - if no valid session, show permission denied menggunakan shared component
  if (!session?.sessionId) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <ProductPreviewShell binding={binding} mode="landing" />
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <PermissionDenied
              title="Akses Ditolak"
              description="Anda tidak memiliki izin untuk melihat penelitian ini. Silakan masuk terlebih dahulu."
              icon="🔒"
              backLabel="Masuk ke Platform"
              onBack={() => window.location.href = `/login?productId=${productId}`}
            />
          </section>
        </div>
      </main>
    );
  }

  React.useEffect(() => {
    async function fetchResearch() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          productId,
          searchQuery,
          filterStatus,
        });
        const res = await fetch(`/api/research?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Gagal memuat penelitian: HTTP ${res.status}`);
        }
        const data = (await res.json()) as { items?: Requirement[] };
        setFilteredResearch(data.items ?? []);
      } catch (err) {
        console.error("[ResearchPage] fetch error:", err);
        setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data penelitian");
      } finally {
        setLoading(false);
      }
    }
    fetchResearch();
  }, [productId, searchQuery, filterStatus]);

  // Loading state selama fetch data menggunakan shared WorkRealityLoading
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <WorkRealityLoading />
      </main>
    );
  }

  // Error state handling menggunakan shared ErrorState
  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <ProductPreviewShell binding={binding} mode="landing" />
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <ErrorState
              title="Gagal Memuat Penelitian"
              description={error}
              icon="⚠️"
              retryLabel="Coba Lagi"
              onRetry={() => window.location.reload()}
            />
          </section>
        </div>
      </main>
    );
  }

  // Empty state handling jika tidak ada penelitian menggunakan shared EmptyState
  if (filteredResearch.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <ProductPreviewShell binding={binding} mode="landing" />
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <EmptyState
              title="Belum ada penelitian yang ditemukan"
              description="Tidak ada penelitian yang cocok dengan kriteria pencarian Anda. Coba ubah filter atau kata kunci pencarian."
              icon="🔍"
            />
          </section>
        </div>
      </main>
    );
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredResearch.length / itemsPerPage);
  const paginatedResearch = filteredResearch.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProductPreviewShell binding={binding} mode="landing" />
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900">
                {experience?.navigation.primaryCta?.label || 'Jelajahi Penelitian'}
              </h1>
              <p className="mt-2 text-slate-600">
                Telusuri ribuan penelitian dari komunitas global, terhubung dengan peneliti, dan bagikan temuan Anda.
              </p>
            </div>
            <ResearchSearchBar 
              productId={productId}
              initialQuery={searchQuery}
              initialStatus={filterStatus}
            />
            <ResearchFeed researchItems={paginatedResearch} productId={productId} />
            
            {/* Pagination menggunakan shared Pagination component */}
                    {totalPages > 1 && (
                      <div className="mt-8">
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          totalItems={filteredResearch.length}
                          itemsPerPage={itemsPerPage}
                          onPageChange={setCurrentPage}
                        />
                      </div>
                    )}
          </div>
        </section>
      </div>
    </main>
  );
}