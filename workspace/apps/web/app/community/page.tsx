import { Suspense } from 'react';
import { CommunityDirectory, ProductPreviewShell } from '@repo/presentation-widgets';
import { CommunitySearchBar } from '@repo/presentation-features';
import { readProductBinding } from '@repo/presentation-experience';

interface CommunityPageProps {
  searchParams?: {
    productId?: string;
    q?: string;
    type?: string;
    location?: string;
  };
}

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const productId = searchParams?.productId ?? 'ilc';
  const binding = readProductBinding(productId);
  const searchQuery = searchParams?.q || '';
  const filterType = searchParams?.type || 'all';
  const filterLocation = searchParams?.location || 'all';

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
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

          {/* Search dan Filter Bar */}
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
      </div>
    </main>
  );
}