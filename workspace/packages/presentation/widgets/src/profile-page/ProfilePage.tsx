"use client";

import React from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell.js";
import { ProfileHeader } from "../profile-header/ProfileHeader.js";
import { getProductExperience } from "@repo/presentation-experience";
import type { ProductPreviewBinding, ProductExperience, Member, Requirement } from "@repo/presentation-types";

export interface ProfilePageProps {
  readonly profileId: string;
  readonly productId: string;
  readonly binding: ProductPreviewBinding;
}

export function ProfilePage({ profileId, productId, binding }: ProfilePageProps) {
  const experience: ProductExperience | undefined = getProductExperience(productId);
  const [profile, setProfile] = React.useState<Member | null>(null);
  const [authoredRequirements, setAuthoredRequirements] = React.useState<Requirement[]>([]);

  React.useEffect(() => {
    async function fetchProfileData() {
      try {
        const url = `/api/profile/${encodeURIComponent(profileId)}?productId=${encodeURIComponent(productId)}&includeRequirements=1`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          profile?: Member | null;
          authoredRequirements?: Requirement[];
        };
        setProfile(data.profile ?? null);
        setAuthoredRequirements(data.authoredRequirements ?? []);
      } catch (err) {
        console.error("[ProfilePage] fetch error:", err);
      }
    }
    if (profileId) fetchProfileData();
  }, [profileId, productId]);

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
        <ProfileHeader member={profile} productId={productId} />
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">Penelitian / Konten Yang Ditulis</h2>
            <p className="mt-1 text-sm text-slate-600">{authoredRequirements.length} item dipublikasikan oleh profil ini.</p>
          </div>
          {authoredRequirements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
              Belum ada konten yang dipublikasikan.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {authoredRequirements.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-base font-semibold text-slate-900">{item.title ?? item.id}</div>
                  {item.summary && <div className="mt-2 text-sm text-slate-600">{item.summary}</div>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}