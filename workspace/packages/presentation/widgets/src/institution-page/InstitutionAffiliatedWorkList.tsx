"use client";

import React from "react";
import { WorkItemCard, type WorkItemCardProps } from "@repo/presentation-features";

export interface InstitutionAffiliatedWorkListProps {
  works: WorkItemCardProps[];
  productId: string;
}

export function InstitutionAffiliatedWorkList({ works, productId }: InstitutionAffiliatedWorkListProps) {
  if (!works || works.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-xl font-bold text-slate-900">Belum ada pekerjaan terafiliasi</h2>
          <p className="mt-2 text-slate-600">Institusi ini belum terlibat dalam pekerjaan apa pun di platform.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Pekerjaan Terafiliasi ({works.length})</h2>
      <div className="space-y-4">
        {works.map((work) => (
          <WorkItemCard
            workId={work.workId}
            title={work.title}
            description={work.description}
            state={work.state}
            href={`/work/${work.workId}?productId=${encodeURIComponent(productId)}`}
            updatedAt={work.updatedAt}
          />
        ))}
      </div>
    </section>
  );
}