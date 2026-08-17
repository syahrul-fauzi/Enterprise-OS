"use client";

import React from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell.js";
import { getProductExperience } from "@repo/presentation-experience";
import type { ProductPreviewBinding, ProductExperience, Requirement } from "@repo/presentation-types";
import { ResearchSearchBar } from "@repo/presentation-ui-system";
import { ResearchFeed } from "../ResearchFeed.js";

export interface ResearchPageProps {
  readonly productId: string;
  readonly binding: ProductPreviewBinding;
  readonly searchQuery?: string;
  readonly filterStatus?: string;
}

export function ResearchPage({ productId, binding, searchQuery = '', filterStatus = 'all' }: ResearchPageProps) {
  const experience: ProductExperience | undefined = getProductExperience(productId);
  const [filteredResearch, setFilteredResearch] = React.useState<Requirement[]>([]);

  React.useEffect(() => {
    async function fetchResearch() {
      try {
        const params = new URLSearchParams({
          productId,
          searchQuery,
          filterStatus,
        });
        const res = await fetch(`/api/research?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items?: Requirement[] };
        setFilteredResearch(data.items ?? []);
      } catch (err) {
        console.error("[ResearchPage] fetch error:", err);
      }
    }
    fetchResearch();
  }, [productId, searchQuery, filterStatus]);

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
            <ResearchFeed researchItems={filteredResearch} productId={productId} />
          </div>
        </section>
      </div>
    </main>
  );
}