import Link from 'next/link';
import type { Requirement } from '@repo/presentation-types';

export interface ResearchFeedProps {
  researchItems: Requirement[];
  productId: string;
}

export function ResearchFeed({ researchItems, productId }: ResearchFeedProps) {
  if (!researchItems || researchItems.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-900">Belum ada penelitian yang dipublikasikan</h3>
        <p className="mt-2 text-slate-600">Jadilah yang pertama untuk berkontribusi dengan penelitian Anda.</p>
        <Link
          href={`/products/${productId}/requirements`}
          className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Mulai Kontribusi
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {researchItems.map((item) => (
        <Link
          key={item.id}
          href={`/products/${productId}/requirements/${item.id}`}
          className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.summary}</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              {item.status === 'verified' ? 'Verified' : item.status === 'implemented' ? 'Published' : 'In Review'}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-slate-200"></div>
              <span className="text-xs text-slate-600">{item.owner || 'Lead Researcher'}</span>
            </div>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">
              {new Date(item.updatedAt || Date.now()).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
