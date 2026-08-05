import Link from 'next/link';
import type { Requirement } from '@repo/presentation-types';

interface PublicationListProps {
  publications: Requirement[];
  productId: string;
}

// Shared component untuk menampilkan daftar publikasi/penelitian di halaman profil
export function PublicationList({ publications, productId }: PublicationListProps) {
  if (!publications || publications.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-900">Belum ada publikasi</h3>
        <p className="mt-2 text-slate-600">Peneliti ini belum mempublikasikan penelitian apa pun di platform ini.</p>
        <Link 
          href={`/products/${productId}/requirements/new`}
          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Mulai Penelitian Baru
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {publications.map((pub) => (
        <Link
          key={pub.id}
          href={`/products/${productId}/requirements/${pub.id}`}
          className="block rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900">{pub.title}</h3>
              <p className="mt-2 text-slate-600 line-clamp-2">{pub.description}</p>
              
              <div className="mt-3 flex flex-wrap gap-2">
                {pub.tags?.map(tag => (
                  <span key={tag} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                pub.status === 'published' ? 'bg-green-100 text-green-700' :
                pub.status === 'peer-review' ? 'bg-yellow-100 text-yellow-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {pub.status === 'published' ? 'Dipublikasikan' : 
                 pub.status === 'peer-review' ? 'Dalam Review' : 'Draft'}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}