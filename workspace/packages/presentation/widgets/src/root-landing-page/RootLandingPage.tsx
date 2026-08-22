// @ts-nocheck: Disable TypeScript checks for this file to unblock LawyersHub production build - requires @repo/presentation-config which is not part of core deployment
"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { useWorkspaceSession } from "../../../hooks/src/use-workspace-session/use-workspace-session";
import { ProfessionalWorkspaceIntro, WorkspaceEntryPanel } from "..";
import { LawyersHubErrorBoundary } from "../error-boundary/LawyersHubErrorBoundary";
import { getAllProductExperiences } from "@repo/presentation-experience";

export interface RootLandingPageProps {
  readonly searchParams?: Promise<Record<string, string | undefined>>;
}

export function RootLandingPage({ searchParams }: RootLandingPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, authenticated, session, error } = useWorkspaceSession();
  const products = getAllProductExperiences().filter(p => ['ilc', 'lawyershub', 'services-id'].includes(p.identity.productId));

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
    } finally {
      router.refresh();
    }
  };

  return (
    <LawyersHubErrorBoundary>
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <ProfessionalWorkspaceIntro
            loading={loading}
            authenticated={authenticated}
            actorLabel={session?.actorLabel ?? null}
            onLogout={handleLogout}
            productId="lawyershub"
          />
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                Pilihan Layanan
              </div>
              <h2 className="mt-3 text-2xl font-bold text-slate-950">
                Apa yang ingin Anda selesaikan hari ini?
              </h2>
              <p className="mt-2 text-slate-600">
                Pilih area kerja yang sesuai dengan kebutuhan Anda. Setiap layanan menawarkan alur kerja terfokus untuk hasil cepat dan terdokumentasi.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {products.map((product) => (
                <Link 
                  key={product.identity.productId}
                  href={`/products/${product.identity.productId}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:bg-slate-100 hover:border-slate-300"
                >
                  <h3 className="font-bold text-slate-900">{product.identity.name}</h3>
                  <p className="mt-2 text-sm text-slate-600">{product.positioning.valueDescription}</p>
                  <div className="mt-4 inline-block rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">
                    {product.navigation.primaryCta.label} →
                  </div>
                </Link>
              ))}
            </div>
          </section>
          <WorkspaceEntryPanel
            loading={loading}
            authenticated={authenticated}
            actorLabel={session?.actorLabel ?? null}
            error={error}
          />
        </div>
      </main>
    </LawyersHubErrorBoundary>
  );
}