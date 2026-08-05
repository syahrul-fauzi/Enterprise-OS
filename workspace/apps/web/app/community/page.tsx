import { Suspense } from 'react';
import { CommunityDirectory } from '../../components/CommunityDirectory';
import { CommunitySearchBar } from '../../components/CommunitySearchBar';
import { ProductPreviewShell } from '../../components/ProductPreviewShell';
import { readProductExperience } from '../../lib/product-experience';
import { readProductPreviewBinding } from '../../lib/product-binding';

// Definisikan tipe Member secara lokal karena @repo/presentation-types tidak export Member
interface Member {
  id: string;
  name: string;
  affiliation?: string;
  type: string;
  location?: string;
}

interface CommunityPageProps {
  searchParams?: {
    productId?: string;
    q?: string;
    type?: string;
    location?: string;
  };
}

// Dummy data sementara sampai repository terkonfigurasi
const getAllMembers = (): Member[] => [
  { id: '1', name: 'Dr. Ahmad Rizki', affiliation: 'ITB', type: 'researcher', location: 'Bandung' },
  { id: '2', name: 'Prof. Siti Aminah', affiliation: 'UI', type: 'professor', location: 'Jakarta' },
  { id: '3', name: 'Dr. Budi Santoso', affiliation: 'UGM', type: 'researcher', location: 'Yogyakarta' },
];

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const productId = searchParams?.productId ?? 'ilc';
  const binding = readProductPreviewBinding(productId);
  const experience = readProductExperience(productId);
  const searchQuery = searchParams?.q || '';
  const filterType = searchParams?.type || 'all';
  const filterLocation = searchParams?.location || 'all';
  
  const allMembers = getAllMembers();

  // Filter anggota berdasarkan search query, type, dan lokasi (REQ-010)
  const filteredMembers = allMembers.filter((member: Member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (member.affiliation && member.affiliation.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || member.type === filterType;
    const matchesLocation = filterLocation === 'all' || (member.location && member.location.toLowerCase() === filterLocation.toLowerCase());
    return matchesSearch && matchesType && matchesLocation;
  });

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
              <CommunityDirectory members={filteredMembers} productId={productId} />
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  );
}