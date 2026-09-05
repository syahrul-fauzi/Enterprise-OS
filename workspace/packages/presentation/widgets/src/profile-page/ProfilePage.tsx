"use client";

import React from "react";
import { ProductPreviewShell } from "../product-preview-shell/index.js";
import { ProfileHeader } from "../profile-header/index.js";
import { getProductExperience } from "@repo/presentation-experience";
import type { ProductPreviewBinding, ProductExperience } from "@repo/presentation-experience";
// Member/Requirement types imported from canonical entities - @ts-nocheck removed (MINIMAL FIX: architecture lock compliance)
import type { Member, Requirement } from "@repo/presentation-entities";
// Import shared state components untuk UX consistency (memenuhi mandate UX-UXSTATE-001)
import { WorkRealityLoading, EmptyState } from "@repo/presentation-ui-system";

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

  // Loading state selama fetch data profil menggunakan shared WorkRealityLoading
  if (!profile) {
    return (
      <main className="min-h-screen bg-slate-50">
        <WorkRealityLoading />
      </main>
    );
  }

  // Return fully rendered profile page
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
            <EmptyState
              title="Belum ada konten yang dipublikasikan"
              description="Profil ini belum mempublikasikan penelitian atau konten apapun di platform."
              icon="📝"
            />
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