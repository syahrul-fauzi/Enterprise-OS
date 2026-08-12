"use client";

import React from "react";
import { capabilityRegistry } from "@repo/core-kernel";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import { ProfileHeader } from "../profile-header/ProfileHeader";
import { ProfileResearchList } from "../profile-research-list/ProfileResearchList";
import { readProductBinding, getProductExperience } from "@repo/presentation-experience";
import type { ProductPreviewBinding, ProductExperience, Member, Requirement } from "@repo/presentation-types";

export interface ProfilePageProps {
  readonly profileId: string;
  readonly rawSearchParams?: Promise<{
    readonly productId?: string;
  }>;
}

export async function ProfilePage({ profileId, rawSearchParams }: ProfilePageProps) {
  const searchParams = rawSearchParams ? await rawSearchParams : {};
  const productId = searchParams.productId || 'academic';
  const binding: ProductPreviewBinding = readProductBinding(productId);
  const experience: ProductExperience | undefined = getProductExperience(productId);
  
  // Fetch all profile data entirely within canonical widget
  const memberOutput = capabilityRegistry.invoke<{ output: Member | null }>("identity", "getMemberById", { memberId: profileId });
  const profile = memberOutput.output;
  
  const researchOutput = capabilityRegistry.invoke<{ output: Requirement[] }>("requirement", "getByAuthor", { authorId: profileId, productId });
  const authoredResearch = researchOutput.output || [];

  if (!profile) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <ProductPreviewShell binding={binding} mode="landing" />
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
              <h1 className="text-2xl font-bold text-slate-900">Profil tidak ditemukan</h1>
              <p className="mt-2 text-slate-600">Profil yang Anda cari tidak tersedia atau telah dihapus dari platform.</p>
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
        <ProfileHeader member={profile} />
        <ProfileResearchList items={authoredResearch} />
      </div>
    </main>
  );
}