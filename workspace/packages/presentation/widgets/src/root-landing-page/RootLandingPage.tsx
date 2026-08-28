"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useWorkspaceSession } from "@repo/presentation-hooks/use-workspace-session";
import { LawyersHubErrorBoundary } from "../error-boundary/LawyersHubErrorBoundary";
import { PRODUCT_DOMAINS_ARRAY, type ProductDomainConfig, getProductFromHostname, getProductDomainConfig } from "@repo/presentation-config/product-domains";

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
  if (id.startsWith('case-')) return "Kasus Hukum"; // LawyersHub
  if (id.startsWith('article-')) return "Artikel Ilmiah"; // Academic
  if (id.startsWith('project-')) return "Proyek Bisnis"; // CommsME
  if (id.startsWith('discussion-')) return "Diskusi Hukum"; // ILC
  if (id.startsWith('service-')) return "Permintaan Layanan"; // Services-ID
  if (id.startsWith('requirement-')) return "Persyaratan";
  if (id.startsWith('request-')) return "Permintaan Layanan";
  return "Pekerjaan";
}

function getWorkIcon(id: string): string {
  if (id.startsWith('case-')) return "⚖️"; // LawyersHub cases
  if (id.startsWith('article-')) return "📚"; // Academic articles
  if (id.startsWith('project-')) return "📊"; // CommsME projects
  if (id.startsWith('discussion-')) return "💬"; // ILC discussions
  if (id.startsWith('service-')) return "🛠️"; // Services-ID requests
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
  const pathname = usePathname();
  const { loading, authenticated, session, error } = useWorkspaceSession();
  const [activeWorks, setActiveWorks] = useState<WorkListItem[]>([]);
  const [worksLoading, setWorksLoading] = useState(true);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Extract product from pathname first (e.g., "/products/lawyershub" → "lawyershub")
  const pathProductId = pathname?.match(/^\/products\/([^/]+)/)?.[1];
  const [currentProduct, setCurrentProduct] = useState<ProductDomainConfig>(() => {
    if (pathProductId) {
      const pathProduct = getProductDomainConfig(pathProductId);
      if (pathProduct) return pathProduct;
    }
    const brandProduct = PRODUCT_DOMAINS_ARRAY.find(p => p.displayName === brandName);
    if (brandProduct) return brandProduct;
    if (typeof window !== 'undefined') {
      const hostProduct = getProductFromHostname(window.location.hostname);
      if (hostProduct) return hostProduct;
    }
    return (PRODUCT_DOMAINS_ARRAY.find(p => p.productId === 'lawyershub') ?? PRODUCT_DOMAINS_ARRAY[0]) as ProductDomainConfig;
  });

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProductDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleProductSwitch = (product: ProductDomainConfig) => {
    setCurrentProduct(product);
    setProductDropdownOpen(false);
    // Navigate to product's root route
    router.push(`/products/${product.productId}`);
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
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase border ${
                  currentProduct.productId === 'lawyershub' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  currentProduct.productId === 'services-id' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                  currentProduct.productId === 'ilc' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                  currentProduct.productId === 'academic' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                  currentProduct.productId === 'commsme' ? 'bg-pink-100 text-pink-800 border-pink-300' :
                  'bg-slate-100 text-slate-800 border-slate-300'
                }`}>
                  {currentProduct.productId === 'lawyershub' ? '⚖️' : 
                   currentProduct.productId === 'services-id' ? '🛠️' : 
                   currentProduct.productId === 'ilc' ? '💼' : 
                   currentProduct.productId === 'academic' ? '📚' :
                   currentProduct.productId === 'commsme' ? '📊' :
                   '📄'} {currentProduct.displayName}
                </span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mt-4">
                {currentProduct.productId === 'lawyershub' ? "Pekerjaan Hukum Anda, terhubung sempurna." :
                 currentProduct.productId === 'services-id' ? "Layanan IT Anda, terkelola profesional." :
                 currentProduct.productId === 'ilc' ? "Diskusi Hukum, Berkembang Bersama." :
                 currentProduct.productId === 'academic' ? "Komunitas Akademik, Bersama Berkembang." :
                 currentProduct.productId === 'commsme' ? "Bisnis Anda, Tumbuh Bersama." :
                 heroTitle}
              </h1>
              
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mt-4">
                {currentProduct.productId === 'lawyershub' 
                  ? "Platform hukum enterprise yang menghubungkan semua pihak dalam satu Workspace yang aman. Satu tempat untuk mengelola seluruh kasus, kontrak, dan persyaratan legal."
                  : currentProduct.productId === 'services-id'
                  ? "Platform manajemen layanan IT enterprise yang menghubungkan tim internal dengan vendor dalam satu ecosystem. Kelola semua permintaan layanan dari mana saja."
                  : currentProduct.productId === 'ilc'
                  ? "Komunitas advokat Indonesia terbesar untuk berbagi pengetahuan hukum, putusan pengadilan, dan kolaborasi profesional antar anggota."
                  : currentProduct.productId === 'academic'
                  ? "Komunitas akademisi dan peneliti Indonesia untuk berbagi penelitian, artikel ilmiah, dan kolaborasi riset bersama institusi lain."
                  : currentProduct.productId === 'commsme'
                  ? "Platform manajemen bisnis untuk UMKM yang menghubungkan pengusaha dengan mitra, supplier, dan pelanggan dalam satu ekosistem."
                  : heroSubtitle}
              </p>
            </div>

            {/* 3-Card Value Proposition Grid - CONTEXT-AWARE SESUAI SETIAP PRODUK */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 mb-8">
              {currentProduct.productId === 'lawyershub' && (
                <>
                  <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">📊</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Setiap Kasus Memiliki Progress yang Terlihat</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Setiap kasus hukum menyimpan progressnya sendiri yang dapat dipantau secara transparan oleh semua pihak yang terlibat.</p>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">📎</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Dokumen Pendukung Terlampir Penuh</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Semua bukti hukum, komunikasi, dan catatan kasus tetap terikat dengan pekerjaannya - tidak terpisah atau hilang.</p>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">⚖️</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Akuntabilitas Profesional</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Bukti hukum dan track record kasus terverifikasi secara blockchain untuk akuntabilitas yang tidak dapat disangkal.</p>
                  </div>
                </>
              )}
              {currentProduct.productId === 'services-id' && (
                <>
                  <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">🛠️</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Permintaan Layanan Terorganisir</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Setiap permintaan layanan IT & maintenance tercatat dengan SLA yang jelas dan terukur.</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">🔧</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Vendor Terhubung Langsung</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Semua vendor dan penyedia layanan terintegrasi dalam satu platform untuk kolaborasi real-time.</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">📈</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Cost & SLA Tracking</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Pantau biaya operasional dan kepatuhan SLA semua layanan dalam dashboard terpadu.</p>
                  </div>
                </>
              )}
              {currentProduct.productId === 'ilc' && (
                <>
                  <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">💬</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Diskusi Terstruktur</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Forum diskusi profesional antar advokat dengan moderasi dan threading yang rapi.</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">📚</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Pustaka Putusan Pengadilan</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Akses ribuan putusan Mahkamah Agung dan peraturan terbaru untuk mendukung praktik hukum.</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">🤝</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Kolaborasi Antar Advokat</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Jaringan profesional Indonesia Lawyers Club untuk berbagi pengetahuan dan referensi.</p>
                  </div>
                </>
              )}
              {currentProduct.productId === 'academic' && (
                <>
                  <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">📚</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Artikel Akademik Terkelola</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Semua karya ilmiah dan artikel penelitian terorganisir dalam satu platform yang aman.</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">👥</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Kolaborasi Peneliti</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Berkolaborasi dengan peneliti lain dari berbagai institusi dalam ekosistem terpadu.</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">🏆</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Kutipan Terverifikasi</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Track record publikasi dan sitasi tercatat secara transparan untuk penilaian akademik.</p>
                  </div>
                </>
              )}
              {currentProduct.productId === 'commsme' && (
                <>
                  <div className="bg-gradient-to-br from-pink-50 to-white border border-pink-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">📋</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Proyek Bisnis Terpadu</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Kelola semua proyek bisnis UMKM dalam satu dashboard yang terintegrasi dengan baik.</p>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-white border border-pink-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">🤝</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Mitra Terhubung</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Semua mitra bisnis, supplier, dan pelanggan terintegrasi dalam ekosistem yang sama.</p>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-white border border-pink-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">📈</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Pertumbuhan Bisnis Terukur</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Pantau perkembangan bisnis dan kinerja proyek dengan analytics terpadu.</p>
                  </div>
                </>
              )}
              {!['lawyershub', 'services-id', 'ilc', 'academic', 'commsme'].includes(currentProduct.productId) && (
                <>
                  <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">📄</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Semua Pekerjaan Terorganisir</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Setiap item pekerjaan memiliki konteks lengkap dan timeline yang jelas untuk semua anggota tim.</p>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">🔗</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Tim Terhubung Penuh</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Semua stakeholder terintegrasi dalam platform yang sama untuk kolaborasi tanpa hambatan.</p>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-6 text-left shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-4">✅</div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Track Record Terverifikasi</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Semua kontribusi dan outcome tercatat secara immutable untuk akuntabilitas penuh.</p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 max-w-md mx-auto space-y-4">
              {authenticated ? (
                <div className="flex flex-col space-y-3">
                  <Link
                    href={`${currentProduct.rootRoute}/new`}
                    className={`w-full py-3.5 px-4 font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-white hover:opacity-90 ${
                      currentProduct.productId === 'services-id' ? 'bg-emerald-600 hover:bg-emerald-700' :
                      currentProduct.productId === 'ilc' ? 'bg-purple-600 hover:bg-purple-700' :
                      currentProduct.productId === 'academic' ? 'bg-orange-600 hover:bg-orange-700' :
                      currentProduct.productId === 'commsme' ? 'bg-pink-600 hover:bg-pink-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    + {currentProduct.productId === 'lawyershub' ? 'Mulai Kasus Baru' :
                       currentProduct.productId === 'services-id' ? 'Buat Permintaan Layanan' :
                       currentProduct.productId === 'ilc' ? 'Mulai Diskusi Baru' :
                       currentProduct.productId === 'academic' ? 'Tulis Artikel Baru' :
                       currentProduct.productId === 'commsme' ? 'Mulai Proyek Baru' :
                       'Mulai Pekerjaan Baru'}
                  </Link>
                  <Link
                    href={currentProduct.rootRoute}
                    className="w-full py-3.5 px-4 bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 font-medium text-sm rounded-xl transition-all flex items-center justify-center"
                  >
                    {currentProduct.productId === 'lawyershub' ? 'Lihat Semua Kasus' :
                     currentProduct.productId === 'services-id' ? 'Lihat Semua Layanan' :
                     currentProduct.productId === 'ilc' ? 'Lihat Semua Diskusi' :
                     currentProduct.productId === 'academic' ? 'Lihat Semua Artikel' :
                     currentProduct.productId === 'commsme' ? 'Lihat Semua Proyek' :
                     'Lihat Semua Pekerjaan'}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="mt-2 w-full py-3 px-4 font-medium text-sm transition-colors text-slate-500 hover:text-slate-800"
                  >
                    Keluar
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    href="/enter"
                    className={`w-full py-3.5 px-5 font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 border-2 ${
                      currentProduct.productId === 'services-id' ? 'bg-emerald-50 border-emerald-600 text-emerald-800 hover:bg-emerald-100' :
                      currentProduct.productId === 'ilc' ? 'bg-purple-50 border-purple-600 text-purple-800 hover:bg-purple-100' :
                      currentProduct.productId === 'academic' ? 'bg-orange-50 border-orange-600 text-orange-800 hover:bg-orange-100' :
                      currentProduct.productId === 'commsme' ? 'bg-pink-50 border-pink-600 text-pink-800 hover:bg-pink-100' :
                      'bg-blue-50 border-blue-600 text-blue-800 hover:bg-blue-100'
                    }`}
                  >
                    <span>Coba Sekarang (Tamu)</span>
                    <svg className="shrink-0" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </Link>

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
                          throw new Error(`Gagal memulai proses masuk: ${res.status} ${errorText}`);
                        }
                        const { authorizationUrl } = await res.json();
                        window.location.href = authorizationUrl;
                      } catch (err) {
                        console.error("Proses masuk gagal:", err);
                        alert("Gagal memulai proses masuk. Silakan coba lagi.");
                      }
                    }}
                    className={`w-full py-3.5 px-5 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 ${
                      currentProduct.productId === 'services-id' ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800' :
                      currentProduct.productId === 'ilc' ? 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800' :
                      currentProduct.productId === 'academic' ? 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800' :
                      currentProduct.productId === 'commsme' ? 'bg-pink-600 hover:bg-pink-700 active:bg-pink-800' :
                      'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                    }`}
                  >
                    <svg
                      className="fill-current shrink-0"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                    >
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span>Masuk dengan Akun Perusahaan (SSO)</span>
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

            <p className="text-slate-600">© 2026 {currentProduct.displayName}. All rights reserved.</p>
          </footer>

          {/* Authenticated User Section - Active Works */}
          {authenticated && (
            <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 mt-0 mb-8 shadow-sm">
              <div className="mb-8 flex flex-col sm:flex-row items-start justify-between gap-4 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300">
                  {session?.actorLabel ? `Selamat datang, ${session.actorLabel}` : "Authenticated"}
                </span>
                
                {/* Multi-tenant Product Switcher - Pindah produk dengan mudah */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
                  >
                    <span>{currentProduct.displayName}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {productDropdownOpen && (
                    <div 
                      className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-2">
                        {PRODUCT_DOMAINS_ARRAY.map((product) => (
                          <button
                            key={product.productId}
                            onClick={() => handleProductSwitch(product)}
                            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                              currentProduct.productId === product.productId
                                ? "bg-blue-50 text-blue-700"
                                : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="font-semibold text-sm">{product.displayName}</div>
                            <div className="text-xs text-slate-500 mt-0.5">Route: {product.rootRoute}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-3 sm:mt-0 mb-1">
                  {currentProduct.productId === 'lawyershub' ? 'Kasus aktif Anda' :
                   currentProduct.productId === 'services-id' ? 'Layanan aktif Anda' :
                   currentProduct.productId === 'ilc' ? 'Diskusi aktif Anda' :
                   currentProduct.productId === 'academic' ? 'Artikel aktif Anda' :
                   currentProduct.productId === 'commsme' ? 'Proyek aktif Anda' :
                   'Pekerjaan aktif Anda'}
                </h2>
                <p className="text-sm text-slate-500 m-0">
                  {currentProduct.productId === 'lawyershub' ? 'Kasus hukum yang sedang berjalan dan membutuhkan perhatian Anda.' :
                   currentProduct.productId === 'services-id' ? 'Permintaan layanan IT yang menunggu diproses oleh tim.' :
                   currentProduct.productId === 'ilc' ? 'Diskusi hukum yang aktif dan butuh kontribusi Anda.' :
                   currentProduct.productId === 'academic' ? 'Artikel ilmiah yang sedang dikerjakan dan butuh penyelesaian.' :
                   currentProduct.productId === 'commsme' ? 'Proyek bisnis yang berjalan dan membutuhkan perhatian Anda.' :
                   'Pekerjaan yang sedang berjalan dan membutuhkan perhatian Anda.'}
                </p>
              </div>
              <Link
                href={`${currentProduct.rootRoute}/new`}
                className={`hidden sm:inline-flex px-5 py-2.5 text-white font-medium text-sm rounded-xl transition-colors ${
                  currentProduct.productId === 'services-id' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  currentProduct.productId === 'ilc' ? 'bg-purple-600 hover:bg-purple-700' :
                  currentProduct.productId === 'academic' ? 'bg-orange-600 hover:bg-orange-700' :
                  currentProduct.productId === 'commsme' ? 'bg-pink-600 hover:bg-pink-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                + {currentProduct.productId === 'lawyershub' ? 'Mulai Kasus' :
                   currentProduct.productId === 'services-id' ? 'Buat Layanan' :
                   currentProduct.productId === 'ilc' ? 'Mulai Diskusi' :
                   currentProduct.productId === 'academic' ? 'Tulis Artikel' :
                   currentProduct.productId === 'commsme' ? 'Mulai Proyek' :
                   'Mulai Pekerjaan'}
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
                <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">
                  {currentProduct.productId === 'lawyershub' ? 'Belum ada kasus aktif' :
                   currentProduct.productId === 'services-id' ? 'Belum ada layanan aktif' :
                   currentProduct.productId === 'ilc' ? 'Belum ada diskusi aktif' :
                   currentProduct.productId === 'academic' ? 'Belum ada artikel aktif' :
                   currentProduct.productId === 'commsme' ? 'Belum ada proyek aktif' :
                   'Belum ada pekerjaan aktif'}
                </h3>
                <p className="text-sm text-slate-500 m-0">
                  {currentProduct.productId === 'lawyershub' ? 'Mulai kasus hukum pertama Anda untuk melihatnya di sini.' :
                   currentProduct.productId === 'services-id' ? 'Buat permintaan layanan pertama Anda untuk melihatnya di sini.' :
                   currentProduct.productId === 'ilc' ? 'Mulai diskusi pertama Anda untuk melihatnya di sini.' :
                   currentProduct.productId === 'academic' ? 'Tulis artikel pertama Anda untuk melihatnya di sini.' :
                   currentProduct.productId === 'commsme' ? 'Mulai proyek pertama Anda untuk melihatnya di sini.' :
                   'Mulai pekerjaan pertama Anda untuk melihatnya di sini.'}
                </p>
                <Link
                  href={`${currentProduct.rootRoute}/new`}
                  className={`inline-block mt-6 px-5 py-2.5 text-white font-medium text-sm rounded-xl transition-colors ${
                    currentProduct.productId === 'services-id' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    currentProduct.productId === 'ilc' ? 'bg-purple-600 hover:bg-purple-700' :
                    currentProduct.productId === 'academic' ? 'bg-orange-600 hover:bg-orange-700' :
                    currentProduct.productId === 'commsme' ? 'bg-pink-600 hover:bg-pink-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  + {currentProduct.productId === 'lawyershub' ? 'Mulai Kasus Pertama' :
                     currentProduct.productId === 'services-id' ? 'Buat Permintaan Layanan Pertama' :
                     currentProduct.productId === 'ilc' ? 'Mulai Diskusi Pertama' :
                     currentProduct.productId === 'academic' ? 'Tulis Artikel Pertama' :
                     currentProduct.productId === 'commsme' ? 'Mulai Proyek Pertama' :
                     'Mulai Pekerjaan Pertama'}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {activeWorks.map((work) => (
                  <Link
                    key={work.id}
                    href={`${currentProduct.rootRoute}/${work.id}`}
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