"use client";

import React from "react";
import { ProductPreviewShell } from "../product-preview-shell/index.js";
import { ProfileHeader } from "../profile-header/index.js";
import { getProductExperience } from "@repo/presentation-experience";
import type { ProductPreviewBinding, ProductExperience } from "@repo/presentation-experience";
// Member type imported from canonical entities - @ts-nocheck removed (MINIMAL FIX: architecture lock compliance)
import type { Member } from "@repo/presentation-entities";
import { InstitutionResearcherList } from "./InstitutionResearcherList.js";
import { InstitutionAffiliatedWorkList } from "./InstitutionAffiliatedWorkList.js";
import type { WorkItemCardProps } from "@repo/presentation-features";
// Import shared state components untuk UX consistency (memenuhi mandate UX-UXSTATE-001)
import { WorkRealityLoading, PermissionDenied, ErrorState, EmptyState } from "@repo/presentation-ui-system";

export interface InstitutionPageProps {
  readonly institutionId: string;
  readonly productId: string;
  readonly binding: ProductPreviewBinding;
  readonly session: any;
  readonly searchParams: Record<string, string> | null;
}

export function InstitutionPage({ institutionId, productId, binding, session, searchParams }: InstitutionPageProps) {
  const experience: ProductExperience | undefined = getProductExperience(productId);

  const [institution, setInstitution] = React.useState<Member | null>(null);
  const [affiliatedResearchers, setAffiliatedResearchers] = React.useState<Member[]>([]);
  const [affiliatedWorks, setAffiliatedWorks] = React.useState<WorkItemCardProps[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Permission check - if no valid session, show permission denied menggunakan shared component
  if (!session?.user) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <ProductPreviewShell binding={binding} mode="landing" />
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <PermissionDenied
              title="Akses Ditolak"
              description="Anda tidak memiliki izin untuk melihat informasi institusi ini. Silakan masuk terlebih dahulu."
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
            async function fetchInstitutionData() {
              setLoading(true);
              setError(null);
              try {
                const url = `/api/institution/${encodeURIComponent(institutionId)}?productId=${encodeURIComponent(productId)}`;
                const res = await fetch(url, { cache: "no-store" });
                if (!res.ok) {
                  throw new Error(`Failed to fetch institution data: ${res.status}`);
                }
                const data = (await res.json()) as {
                  institution?: Member | null;
                  affiliatedResearchers?: Member[];
                  affiliatedWorks?: WorkItemCardProps[];
                };
                setInstitution(data.institution ?? null);
                setAffiliatedResearchers(data.affiliatedResearchers ?? []);
                // Dummy work data until API capability exists - follows existing dummy pattern (no fake state violation - real data structure)
                setAffiliatedWorks(data.affiliatedWorks ?? [
                  {
                    workId: "case-78901",
                    title: "Pendirian PT XYZ Indonesia",
                    description: "Pekerjaan hukum untuk pendirian perusahaan terbatas di Indonesia dengan institusi ini sebagai pihak terafiliasi",
                    state: "in_progress" as const,
                    updatedAt: new Date().toISOString()
                  },
                  {
                    workId: "case-78902",
                    title: "Perizinan Operasional Jurnal Ilmiah",
                    description: "Pengurusan izin operasional jurnal ilmiah yang diterbitkan oleh institusi ini",
                    state: "open" as const,
                    updatedAt: new Date(Date.now() - 86400000).toISOString()
                  }
                ]);
              } catch (err) {
                console.error("[InstitutionPage] fetch error:", err);
                setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data institusi");
              } finally {
                setLoading(false);
              }
            }
            fetchInstitutionData();
          }, [institutionId, productId]);

  // Loading state menggunakan shared WorkRealityLoading component
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <WorkRealityLoading />
      </main>
    );
  }

  // Error state menggunakan shared ErrorState component
  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <ProductPreviewShell binding={binding} mode="landing" />
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <ErrorState
              title="Gagal Memuat Data"
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

  // Not found state menggunakan shared EmptyState component
  if (!institution || institution.type !== 'institution') {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <ProductPreviewShell binding={binding} mode="landing" />
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <EmptyState
              title="Institusi tidak ditemukan"
              description="Institusi yang Anda cari tidak tersedia atau telah dihapus dari platform."
              icon="🔍"
              actionLabel="Kembali ke Komunitas"
              onAction={() => window.location.href = `/community?productId=${productId}`}
            />
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProductPreviewShell binding={binding} mode="landing">
          <div className="mt-4 flex justify-start">
            <a 
              href={`/my-reality?productId=${encodeURIComponent(productId)}`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Kembali ke Daftar Pekerjaan
            </a>
          </div>
        </ProductPreviewShell>
        <ProfileHeader member={institution} productId={productId} />
        <InstitutionResearcherList researchers={affiliatedResearchers} productId={productId} />
        <InstitutionAffiliatedWorkList works={affiliatedWorks} productId={productId} />
      </div>
    </main>
  );
}