import { Suspense } from 'react';
import { getMemberById } from '@repo/core-repository';
import { getMembersByInstitution } from '@repo/core-repository';
import { ProfileHeader, InstitutionResearcherList, ProductPreviewShell } from '@repo/presentation-widgets';
import { readProductBinding, readProductExperience } from '@repo/presentation-experience';

// Halaman /institution/[id] sebagai shared page untuk semua produk community-mode
// Menampilkan detail institusi beserta daftar peneliti yang terafiliasi dengannya
export default async function InstitutionPage({ params, searchParams }) {
  const institutionId = params.id;
  const productId = searchParams?.productId || 'academic';
  const binding = readProductBinding(productId);
  const experience = readProductExperience(productId);
  
  // Fetch data institusi dan peneliti yang terafiliasi
  const institution = await getMemberById(institutionId);
  const affiliatedResearchers = await getMembersByInstitution({ institutionId, productId });

  if (!institution || institution.type !== 'institution') {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <ProductPreviewShell binding={binding} mode="landing" />
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
              <h1 className="text-2xl font-bold text-slate-900">Institusi tidak ditemukan</h1>
              <p className="mt-2 text-slate-600">Institusi yang Anda cari tidak tersedia atau telah dihapus dari platform.</p>
              <a 
                href={`/community?productId=${productId}`}
                className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Kembali ke Komunitas
              </a>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProductPreviewShell binding={binding} mode="landing" />
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="max-w-5xl mx-auto px-4 py-8">
            {/* Header profil institusi */}
            <ProfileHeader member={institution} productId={productId} />
            
            {/* Daftar peneliti terafiliasi */}
            <div className="mt-12">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Peneliti Terafiliasi ({affiliatedResearchers?.length || 0})</h2>
              <Suspense fallback={<div className="animate-pulse h-96 bg-slate-100 rounded-xl"></div>}>
                <InstitutionResearcherList researchers={affiliatedResearchers} productId={productId} />
              </Suspense>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}