import Link from 'next/link';
import type { Member } from '@repo/presentation-entities';

// Dummy data anggota komunitas
const getAllMembers = (): Member[] => [
  { id: '1', name: 'Dr. Ahmad Rizki', affiliation: 'ITB', type: 'researcher', location: 'Bandung' },
  { id: '2', name: 'Prof. Siti Aminah', affiliation: 'UI', type: 'professor', location: 'Jakarta' },
  { id: '3', name: 'Dr. Budi Santoso', affiliation: 'UGM', type: 'researcher', location: 'Yogyakarta' },
];

export interface CommunityDirectoryProps {
  productId: string;
  searchQuery?: string;
  filterType?: string;
  filterLocation?: string;
}

export function CommunityDirectory({ 
  productId, 
  searchQuery = '', 
  filterType = 'all', 
  filterLocation = 'all' 
}: CommunityDirectoryProps) {
  const allMembers = getAllMembers();
  
  // Filter anggota berdasarkan search query, type, dan lokasi
  const filteredMembers = allMembers.filter((member: Member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (member.affiliation && member.affiliation.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || member.type === filterType;
    const matchesLocation = filterLocation === 'all' || (member.location && member.location.toLowerCase() === filterLocation.toLowerCase());
    return matchesSearch && matchesType && matchesLocation;
  });
  if (!filteredMembers || filteredMembers.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-900">Belum ada anggota yang terdaftar</h3>
        <p className="mt-2 text-slate-600">Jadilah yang pertama untuk bergabung dan membangun komunitas ini bersama-sama.</p>
        <Link
          href={`/products/${productId}/requirements`}
          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Mulai Bergabung
        </Link>
      </div>
    );
  }

  const researchers = filteredMembers.filter(m => m.type === 'researcher');
  const institutions = filteredMembers.filter(m => m.type === 'institution');

  return (
    <div className="space-y-12">
      {researchers.length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-bold text-slate-900">Peneliti Aktif</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {researchers.map((member) => (
              <Link
                key={member.id}
                href={`/profile/${member.id}`}
                className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-lg"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 h-16 w-16 rounded-full bg-slate-200"></div>
                  <h3 className="text-lg font-semibold text-slate-900">{member.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{member.affiliation || 'Independent Researcher'}</p>
                  <div className="mt-3 flex gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {member.publicationCount || 0} Publikasi
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {institutions.length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-bold text-slate-900">Institusi Anggota</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {institutions.map((member) => (
              <Link
                key={member.id}
                href={`/institution/${member.id}?productId=${productId}`}
                className="rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <span className="text-xs font-bold text-blue-600">🏛️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{member.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">{member.location || 'Global Institution'}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {member.researcherCount || 0} peneliti terdaftar • {member.publicationCount || 0} total publikasi
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}