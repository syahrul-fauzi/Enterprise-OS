"use client";

import { Suspense, use } from 'react';
import { CommunityDirectory } from "../CommunityDirectory";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import { CommunitySearchBar } from "@repo/presentation-features";
import { readProductBinding } from "@repo/presentation-experience";
import type { ProductPreviewBinding } from "@repo/presentation-types";

export interface CommunityPageProps {
  readonly rawSearchParams?: Promise<{
    productId?: string;
    q?: string;
    type?: string;
    location?: string;
  }>;
}

export function CommunityPage({ 
  rawSearchParams
}: CommunityPageProps) {
  const params = use(rawSearchParams ?? Promise.resolve({}));
  const productId = params?.productId ?? 'ilc';
  const searchQuery = params?.q || '';
  const filterType = params?.type || 'all';
  const filterLocation = params?.location || 'all';
  const binding = readProductBinding(productId);

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
        </div>
      </section>
    </>
  );
}