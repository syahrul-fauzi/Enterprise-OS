"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useWorkspaceSession } from "@repo/presentation-hooks/use-workspace-session";
import { LawyersHubErrorBoundary } from "../error-boundary/LawyersHubErrorBoundary";

export interface RootLandingPageProps {
  readonly brandName: string;
  readonly heroTitle: string;
  readonly heroSubtitle: string;
  readonly theme?: {
    readonly primaryColor: string; // e.g., 'blue'
    readonly cardBgClass: string; // e.g., 'bg-blue-600'
    readonly cardTextClass: string; // e.g., 'text-blue-100'
    readonly buttonBgClass: string; // e.g., 'bg-white'
    readonly buttonTextClass: string; // e.g., 'text-blue-600'
    readonly buttonHoverBgClass: string; // e.g., 'hover:bg-slate-100'
  };
  readonly searchParams?: Promise<Record<string, string | undefined>>;
}

interface WorkListItem {
  id: string;
  title: string;
  type: string;
  status: string;
  nextAction: string;
  createdAt: string;
}

function getWorkTypeLabel(id: string): string {
  if (id.startsWith('case-')) return "Kasus Hukum";
  if (id.startsWith('requirement-')) return "Persyaratan";
  if (id.startsWith('request-')) return "Permintaan Layanan";
  return "Pekerjaan";
}

function getWorkIcon(id: string): string {
  if (id.startsWith('case-')) return "⚖️";
  if (id.startsWith('requirement-')) return "📋";
  if (id.startsWith('request-')) return "🛠️";
  return "📄";
}

export function RootLandingPage({ 
  brandName,
  heroTitle,
  heroSubtitle,
  theme,
  searchParams 
}: RootLandingPageProps) {
  const router = useRouter();
  const { loading, authenticated, session, error } = useWorkspaceSession();
  const [activeWorks, setActiveWorks] = useState<WorkListItem[]>([]);
  const [worksLoading, setWorksLoading] = useState(true);

  const currentTheme = theme || {
    primaryColor: 'blue',
    cardBgClass: 'bg-blue-600',
    cardTextClass: 'text-blue-100',
    buttonBgClass: 'bg-white',
    buttonTextClass: 'text-blue-600',
    buttonHoverBgClass: 'hover:bg-slate-100',
  };

  useEffect(() => {
    if (!authenticated) {
      setWorksLoading(false);
      return;
    }
    const fetchAllWorks = async () => {
      try {
        const [casesRes, requirementsRes, serviceRequestsRes] = await Promise.all([
          fetch("/api/cases/list", { cache: "no-store" }),
          fetch("/api/requirements/list", { cache: "no-store" }),
          fetch("/api/service-requests/list", { cache: "no-store" })
        ]);
        const cases = casesRes.ok ? await casesRes.json().then(r => r.cases || []) : [];
        const requirements = requirementsRes.ok ? await requirementsRes.json().then(r => r.requirements || []) : [];
        const serviceRequests = serviceRequestsRes.ok ? await serviceRequestsRes.json().then(r => r.requests || []) : [];
        const allWorks: WorkListItem[] = [...cases, ...requirements, ...serviceRequests]
          .filter((w: any) => w.status !== "closed" && w.status !== "completed")
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map((w: any) => ({
            id: w.id,
            title: w.title,
            type: getWorkTypeLabel(w.id),
            status: w.status?.replace(/_/g, " ") || "open",
            nextAction: w.description || "Menunggu tindakan",
            createdAt: w.createdAt
          }));
        setActiveWorks(allWorks);
      } catch (err) {
        console.error("[RootLandingPage] Fetch works failed:", err);
      } finally {
        setWorksLoading(false);
      }
    };
    void fetchAllWorks();
  }, [authenticated]);

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
      {/* Outer Container: Mencegah overflow horizontal & atur alignment vertikal */}
      <main suppressHydrationWarning className="min-h-screen w-full bg-slate-100 flex flex-col p-4 sm:p-6 md:p-12 overflow-x-hidden font-sans">
        {/* Main Container */}
        <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col">
          {/* Main Card: Responsif dari 1 kolom (mobile) ke 12 kolom (desktop) */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 md:p-12 mt-8 mb-8 text-center">
            
            <div className="max-w-xl mx-auto">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold tracking-wide uppercase border border-blue-300">
                  ⚖️ {brandName}
                </span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mt-4">
                {heroTitle}
              </h1>
              
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mt-4">
                {heroSubtitle}
              </p>
            </div>

            <div className="mt-8 max-w-md mx-auto space-y-4">
              {authenticated ? (
                <div className="flex flex-col space-y-3">
                  <Link
                    href="/work/new"
                    className="w-full py-3.5 px-4 font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800"
                  >
                    + Start a New Work
                  </Link>
                  <Link
                    href="/work"
                    className="w-full py-3.5 px-4 bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 font-medium text-sm rounded-xl transition-all flex items-center justify-center"
                  >
                    View All Works
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="mt-2 w-full py-3 px-4 font-medium text-sm transition-colors text-slate-500 hover:text-slate-800"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/auth/oidc-login', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({})
                        });
                        if (!res.ok) {
                          const errorText = await res.text();
                          throw new Error(`Failed to initiate login: ${res.status} ${errorText}`);
                        }
                        const { authorizationUrl } = await res.json();
                        window.location.href = authorizationUrl;
                      } catch (err) {
                        console.error("Login failed:", err);
                        alert("Failed to start login process. Please try again.");
                      }
                    }}
                    className="w-full py-3.5 px-5 bg-blue-600 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 hover:bg-blue-700 active:bg-blue-800"
                  >
                    <svg 
                      className="fill-current shrink-0" 
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                    >
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span>Login with Enterprise SSO</span>
                  </button>
                  
                  <p className="text-xs leading-normal font-medium text-slate-500">
                    Mendukung Microsoft Entra ID, Google Workspace & SAML 2.0
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Footer Responsif */}
          <footer className="pt-6 pb-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium text-slate-500 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              SOC 2 Type II
            </span>
            <span className="text-slate-400">•</span>
            <span>256-Bit Encryption</span>
            <span className="text-slate-400">•</span>
            <span>GDPR & UU PDP</span>
          </div>

          <p className="text-slate-600">© 2026 {brandName}. All rights reserved.</p>
        </footer>

          {/* Authenticated User Section - Active Works */}
          {authenticated && (
            <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 mt-0 mb-8 shadow-sm">
              <div className="mb-8 flex flex-col sm:flex-row items-start justify-between gap-4 w-full">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300">
                  {session?.actorLabel ? `Selamat datang, ${session.actorLabel}` : "Authenticated"}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-3 mb-1">Your active work</h2>
                <p className="text-sm text-slate-500 m-0">
                  Pekerjaan yang sedang berjalan dan membutuhkan perhatian Anda.
                </p>
              </div>
              <Link
                href="/work/new"
                className="hidden sm:inline-flex px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl transition-colors"
              >
                + Start a Work
              </Link>
            </div>

            {worksLoading ? (
              <div className="flex flex-col gap-4">
                {[1,2,3].map(i => (
                  <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : activeWorks.length === 0 ? (
              <div className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-xl p-12 text-center">
                <div className="text-5xl">📭</div>
                <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">Belum ada pekerjaan aktif</h3>
                <p className="text-sm text-slate-500 m-0">
                  Mulai pekerjaan pertama Anda untuk melihatnya di sini.
                </p>
                <Link
                  href="/work/new"
                  className="inline-block mt-6 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl transition-colors"
                >
                  + Mulai Pekerjaan Pertama
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {activeWorks.map((work) => (
                  <Link
                    key={work.id}
                    href={`/work/${work.id}`}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 border border-slate-200 bg-white rounded-xl hover:border-slate-400 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{getWorkIcon(work.id)}</div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900 m-0">{work.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">{work.type}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
      </main>
    </LawyersHubErrorBoundary>
  );
}