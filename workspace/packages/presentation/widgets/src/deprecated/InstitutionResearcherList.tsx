import Link from 'next/link';
import type { Member } from '@repo/presentation-entities';

export interface InstitutionResearcherListProps {
  researchers: Member[];
  productId: string;
}

export function InstitutionResearcherList({ researchers, productId }: InstitutionResearcherListProps) {
  if (!researchers || researchers.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-900">Belum ada peneliti terafiliasi</h3>
        <p className="mt-2 text-slate-600">Institusi ini belum memiliki peneliti yang bergabung dan mendaftarkan afiliasinya.</p>
        <Link
          href={`/products/${productId}/requirements/new`}
          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Daftarkan Diri
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {researchers.map((researcher) => (
        <Link
          key={researcher.id}
          href={`/profile/${researcher.id}?productId=${productId}`}
          className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-lg"
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 h-16 w-16 rounded-full bg-slate-200"></div>
            <h3 className="text-lg font-semibold text-slate-900">{researcher.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{researcher.researchFocus || 'General Research'}</p>
            <div className="mt-3 flex gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {researcher.publicationCount || 0} Publikasi
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}