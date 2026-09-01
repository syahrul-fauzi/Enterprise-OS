"use client";

import React from "react";
import type { Member } from "@repo/presentation-entities";

export interface InstitutionResearcherListProps {
  researchers: Member[];
  productId: string;
}

export function InstitutionResearcherList({ researchers, productId }: InstitutionResearcherListProps) {
  if (!researchers || researchers.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-xl font-bold text-slate-900">Belum ada peneliti terafiliasi</h2>
          <p className="mt-2 text-slate-600">Institusi ini belum memiliki peneliti yang terdaftar.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Peneliti Afiliasi ({researchers.length})</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {researchers.map((researcher) => (
          <a
            key={researcher.id}
            href={`/profile/${researcher.id}?productId=${encodeURIComponent(productId)}`}
            className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition-colors"
          >
            <h3 className="font-semibold text-slate-900">{researcher.name || "Unknown"}</h3>
            <p className="text-sm text-slate-600 mt-1">{researcher.affiliation || "No affiliation"}</p>
          </a>
        ))}
      </div>
    </section>
  );
}