import { Suspense } from 'react';
import { getAllRequirements } from '@repo/core-repository';
import { ResearchFeed, ProductPreviewShell } from '@repo/presentation-widgets';
import { ResearchSearchBar } from '@repo/presentation-ui-system';
import { readProductBinding, readProductExperience } from '@repo/presentation-experience';

// Halaman /research sebagai shared browse page untuk semua produk yang menggunakan discoveryMode: community
// Mendukung filtering by productId, search query, dan research status via query parameter
export default async function ResearchPage({ searchParams }) {
  const productId = searchParams?.productId || 'academic'; // Default ke academic
  const searchQuery = searchParams?.q || '';
  const filterStatus = searchParams?.status || 'all'; // 'all', 'open', 'in-progress', 'completed'
  const binding = readProductBinding(productId);
  const experience = readProductExperience(productId);
  const allResearch = await getAllRequirements({ productId });

  // Filter penelitian berdasarkan search query dan status
  const filteredResearch = allResearch.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (item.author && item.author.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProductPreviewShell binding={binding} mode="landing" />
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            {experience.navigation.primaryCta?.label || 'Jelajahi Penelitian'}
          </h1>
          <p className="mt-2 text-slate-600">
            Telusuri ribuan penelitian dari komunitas global, terhubung dengan peneliti, dan bagikan temuan Anda.
          </p>
        </div>

        {/* Search dan Filter Bar untuk Research */}
        <ResearchSearchBar 
          initialQuery={searchQuery} 
          initialStatus={filterStatus} 
          productId={productId} 
        />
        
        <div className="mt-8">
          <Suspense fallback={<div className="animate-pulse h-96 bg-slate-100 rounded-xl"></div>}>
            <ResearchFeed researchItems={filteredResearch} productId={productId} />
          </Suspense>
        </div>
      </div>
        </section>
      </div>
    </main>
  );
}