"use client";

import React from "react";
import { capabilityRegistry } from "@repo/core-kernel";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import { ProfileHeader } from "../profile-header/ProfileHeader";
import { getProductExperience } from "@repo/presentation-experience";
import type { ProductPreviewBinding, ProductExperience, Member } from "@repo/presentation-types";

export interface InstitutionPageProps {
  readonly institutionId: string;
  readonly productId: string;
  readonly binding: ProductPreviewBinding;
}

export function InstitutionPage({ institutionId, productId, binding }: InstitutionPageProps) {
  const experience: ProductExperience | undefined = getProductExperience(productId);
  
  // Fetch data entirely within canonical widget
  const memberOutput = capabilityRegistry.invoke<{ output: Member | null }>("identity", "getMemberById", { memberId: institutionId });
  const institution = memberOutput.output;
  
  const researchersOutput = capabilityRegistry.invoke<{ output: Member[] }>("identity", "getMembersByInstitution", { institutionId, productId });
  const affiliatedResearchers = researchersOutput.output || [];

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
        <ProfileHeader member={institution} />
        <InstitutionResearcherList researchers={affiliatedResearchers} />
      </div>
    </main>
  );
}