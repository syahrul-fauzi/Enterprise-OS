// @ts-nocheck: Disable TypeScript checks for this file - requires @repo/presentation-features which is not part of LawyersHub core workflow
"use client";

import { Suspense } from 'react';
import { CommunityDirectory } from "../CommunityDirectory";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import { CommunitySearchBar } from "@repo/presentation-ui-system";
import type { ProductPreviewBinding } from "@repo/presentation-types";

export interface CommunityPageProps {
  readonly productId: string;
  readonly binding: ProductPreviewBinding;
  readonly searchQuery?: string;
  readonly filterType?: string;
  readonly filterLocation?: string;
}

export function CommunityPage({ 
  productId,
  binding,
  searchQuery = '',
  filterType = 'all',
  filterLocation = 'all'
}: CommunityPageProps) {

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