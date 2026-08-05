import { Suspense } from 'react';
import { getMemberById } from '@/lib/member-repository';
import { getRequirementsByOwner } from '@/lib/requirement-repository';
import { ProfileHeader } from '@/components/ProfileHeader';
import { PublicationList } from '@/components/PublicationList';
import { ProductPreviewShell } from '@/components/ProductPreviewShell';
import { readProductExperience } from '@/lib/product-experience';

// Halaman /profile/[id] sebagai shared profile page untuk semua produk community-mode
// Mendukung filtering by productId via searchParams, sama seperti halaman /research dan /community
export default async function ProfilePage({ params, searchParams }) {
  const memberId = params.id;
  const productId = searchParams?.productId || 'academic';
  const experience = readProductExperience(productId);
  
  // Fetch data member dan publikasi mereka
  const member = await getMemberById(memberId);
  const publications = await getRequirementsByOwner({ ownerId: memberId, productId });

  if (!member) {
    return (
      <ProductPreviewShell productId={productId} experience={experience}>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Profil tidak ditemukan</h1>
          <p className="mt-2 text-slate-600">Profil peneliti yang Anda cari tidak tersedia atau telah dihapus.</p>
          <a 
            href={`/community?productId=${productId}`}
            className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Kembali ke Komunitas
          </a>
        </div>
      </ProductPreviewShell>
    );
  }

  return (
    <ProductPreviewShell productId={productId} experience={experience}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header profil */}
        <ProfileHeader member={member} productId={productId} />
        
        {/* Daftar publikasi */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Publikasi & Penelitian</h2>
          <Suspense fallback={<div className="animate-pulse h-64 bg-slate-100 rounded-xl"></div>}>
            <PublicationList publications={publications} productId={productId} />
          </Suspense>
        </div>
      </div>
    </ProductPreviewShell>
  );
}