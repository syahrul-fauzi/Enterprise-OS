"use client";

import Link from "next/link";
import React from "react";
import { useEffect, useState } from "react";
import type { ProductExperience } from "@repo/presentation-entities";
import type { ProductPreviewBinding } from "@repo/presentation-experience";
import { getProductExperience } from "@repo/presentation-experience";
import { createWorkspaceNavigation, type NavigationDescriptor, type NavigationItem } from "@repo/composition/navigation"; // IDE cache refresh

type ProductRealitySnapshot = {
  items: Array<{
    requirementId: string;
    displayTitle: string;
    displayEyebrow: string;
    status: string;
    verificationStatus: string;
    owner?: string;
  }>;
};

type ServiceProviderCategory =
  | "Cloud Services"
  | "IT Support"
  | "Infrastructure"
  | "Cybersecurity"
  | "Software Development"
  | "Managed Services"
  | "Data & Analytics";

type TopicCategory =
  | "Hukum Perusahaan"
  | "Hukum Perdata"
  | "Hukum Pidana"
  | "Hukum Keluarga"
  | "Hukum Internasional"
  | "Hukum Teknologi Digital"
  | "Hukum Ketenagakerjaan"
  | "Hukum Tata Negara";

const SHARED_SERVICE_CATEGORIES: readonly ServiceProviderCategory[] = [
  "Cloud Services",
  "IT Support",
  "Infrastructure",
  "Cybersecurity",
  "Software Development",
];

const SHARED_LEGAL_TOPICS: readonly TopicCategory[] = [
  "Hukum Perusahaan",
  "Hukum Perdata",
  "Hukum Pidana",
  "Hukum Keluarga",
  "Hukum Internasional",
  "Hukum Teknologi Digital",
  "Hukum Ketenagakerjaan",
  "Hukum Tata Negara",
];

function buildPresentationAdapter(experience: ProductExperience | undefined, binding: ProductPreviewBinding) {
  if (!experience) {
    return {
      categoryLabel: binding.productId.toUpperCase(),
      summary: "",
      audienceTitle: "",
      audienceDescription: "",
      valueTitle: "",
      valueDescription: "",
      proofTitle: "",
      proofDescription: "",
      proofBullets: [] as readonly string[],
    };
  }
  return {
    categoryLabel: experience.identity.category,
    summary: experience.narrative.summary,
    audienceTitle: experience.audience.primary,
    audienceDescription: experience.audience.description,
    valueTitle: experience.positioning.valueTitle,
    valueDescription: experience.positioning.valueDescription,
    proofTitle: experience.trustSignals.title,
    proofDescription: experience.trustSignals.description,
    proofBullets: experience.trustSignals.bullets,
  };
}

function buildLandingSectionsFromJourneys(experience: ProductExperience | undefined) {
  if (!experience || !experience.journeys || experience.journeys.length === 0) {
    return [];
  }
  return experience.journeys.slice(0, 3).map((j) => ({
    id: j.id,
    eyebrow: j.label,
    title: j.label,
    description: j.description,
    bullets: [] as readonly string[],
  }));
}

function buildEntryQuestion(experience: ProductExperience | undefined) {
  if (!experience) return "Apa yang ingin Anda lakukan hari ini?";
  return experience.entry.primaryIntent;
}

function buildEntryAnswer(experience: ProductExperience | undefined, binding: ProductPreviewBinding) {
    if (!experience) return "Pilih tindakan alami pertama Anda di bawah untuk memulai.";
    
    // Indonesian localization with product-specific language to ensure distinctiveness
    if (binding.productId === "lawyershub") {
      return "LawyersHub adalah platform manajemen kasus hukum profesional untuk membuka masalah hukum, memantau progres penanganan, dan menjaga akuntabilitas semua pihak. Jalankan pekerjaan hukum dengan konteks, bukti, dan transparansi sehingga klien dan profesional dapat melihat apa yang terjadi dan langkah apa selanjutnya.";
    }
    if (binding.productId === "services-id") {
      return "Services.ID adalah pasar layanan digital dan platform pengiriman yang membantu Anda menerjemahkan kebutuhan menjadi layanan yang dapat dipantau dan dipercaya. Jelaskan apa yang Anda butuhkan, proses akan berjalan, dan Anda dapat meninjau hasil pengiriman dengan bukti yang terverifikasi.";
    }
    if (binding.productId === "ilc") {
      return "ILC adalah pusat pengetahuan hukum dan komunitas profesional di mana siapa saja dapat mengeksplorasi, memahami, mendiskusikan, dan berkontribusi pada wacana hukum. Temukan wawasan hukum, bergabung dalam diskusi dengan ahli, dan berkontribusi pada kumpulan pengetahuan hukum bersama yang dapat diakses oleh semua orang.";
    }
    if (binding.productId === "academic") {
      return "Academic Community adalah platform kolaborasi penelitian global di mana peneliti dapat berbagi temuan, berkolaborasi dengan rekan sejawat dari seluruh dunia, dan membangun pengetahuan kolektif dengan bukti yang dapat diverifikasi dan tinjauan sejawat yang terbuka.";
    }
    
    // Fallback for other products
    return `${experience.narrative.summary} ${experience.positioning.valueDescription}`;
  }

function buildProductRealitySnapshot(productId: string, experience: ProductExperience | undefined): ProductRealitySnapshot {
  if (!experience) return { items: [] };
  const examples: Record<string, ProductRealitySnapshot> = {
    "lawyershub": {
      items: [
        { requirementId: "case-101", displayTitle: "Kasus Perizinan Usaha CV Maju", displayEyebrow: "Perusahaan", status: "In Progress", verificationStatus: "draft" },
        { requirementId: "case-102", displayTitle: "Sengketa Tanah Keluarga Wijaya", displayEyebrow: "Perdata", status: "Open", verificationStatus: "in_review" },
        { requirementId: "case-103", displayTitle: "Review Kontrak Vendor SaaS", displayEyebrow: "Kontrak", status: "Closed", verificationStatus: "passed" },
      ],
    },
    "services-id": {
      items: [
        { requirementId: "sreq-201", displayTitle: "Setup Jaringan Kantor Cabang", displayEyebrow: "IT Support", status: "In Service", verificationStatus: "draft" },
        { requirementId: "sreq-202", displayTitle: "Audit Keamanan Aplikasi Web", displayEyebrow: "Cybersecurity", status: "Accepted", verificationStatus: "in_review" },
        { requirementId: "sreq-203", displayTitle: "Migrasi Server ke Cloud", displayEyebrow: "Cloud Services", status: "Delivered", verificationStatus: "passed" },
      ],
    },
    "ilc": {
      items: [
        { requirementId: "disc-301", displayTitle: "Implementasi UU PDP di Startup Teknologi", displayEyebrow: "Hukum Teknologi Digital", status: "Active", verificationStatus: "draft", owner: "Praktisi Hukum Senior" },
        { requirementId: "disc-302", displayTitle: "Tanggung Jawab Direksi dalam PT", displayEyebrow: "Hukum Perusahaan", status: "Published", verificationStatus: "verified", owner: "ILC Editorial" },
      ],
    },
    "academic": {
      items: [
        { requirementId: "art-401", displayTitle: "Perbandingan Perlindungan Data Pribadi: EU GDPR vs UU PDP Indonesia", displayEyebrow: "Hukum Tata Negara", status: "Published", verificationStatus: "verified", owner: "Fakultas Hukum UI" },
        { requirementId: "art-402", displayTitle: "Analisis Yuridis Arbitrase Internasional di Asia Tenggara", displayEyebrow: "Hukum Internasional", status: "Accepted", verificationStatus: "draft", owner: "Research Fellow" },
      ],
    },
  };
  return examples[productId] ?? { items: [] };
}

async function fetchLawyersHubCaseStats() {
  try {
    const resp = await fetch("/api/cases/list");
    if (resp.ok) {
      const data = await resp.json();
      const cases = data.cases || [];
      const active = cases.filter((item: any) => item.status === "in_progress" || item.status === "open").length;
      const completed = cases.filter((item: any) => item.status === "closed" || item.verificationStatus === "passed").length;
      const pending = cases.filter((item: any) => item.status === "draft" || item.verificationStatus === "pending").length;
      return { active, completed, pending };
    }
  } catch (err) {
    console.error("[ProductPreviewShell] Failed to fetch case stats:", err);
  }
  // Fallback jika fetch gagal
  return { active: 0, completed: 0, pending: 0 };
}

function readServiceProviderCategories(experience: ProductExperience | undefined): readonly string[] {
  if (experience?.entry?.categories && experience.entry.categories.length > 0) {
    return experience.entry.categories;
  }
  return SHARED_SERVICE_CATEGORIES;
}

function readILCTopicLabels(experience: ProductExperience | undefined): readonly string[] {
  if (experience?.entry?.topics && experience.entry.topics.length > 0) {
    return experience.entry.topics.map((t) => t.label);
  }
  return SHARED_LEGAL_TOPICS;
}

export interface ProductPreviewShellProps {
  readonly binding: ProductPreviewBinding;
  readonly mode?: "landing" | "requirements" | "delivery" | "detail" | "trace";
  readonly children?: React.ReactNode;
  readonly session?: any;
}

export function ProductPreviewShell({
  binding,
  mode = "landing",
  children,
  session,
}: ProductPreviewShellProps) {
  const experience = getProductExperience(binding.productId) as ProductExperience | undefined;
  const presentation = buildPresentationAdapter(experience, binding);
  const [reality, setReality] = useState<ProductRealitySnapshot | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const requirementsHref = `/products/${binding.productId}${binding.route}`;
  const deliveryHref = `/products/${binding.productId}/delivery`;
  const overviewHref = `/products/${binding.productId}`;

  useEffect(() => {
    if (mode === "landing") {
      const snapshot = buildProductRealitySnapshot(binding.productId, experience);
      setReality(snapshot);
    }
  }, [binding.productId, mode, experience]);

  const [stats, setStats] = useState({ active: 0, completed: 0, pending: 0 });

  useEffect(() => {
    const loadStats = async () => {
      if (binding.productId === "lawyershub") {
        const fetchedStats = await fetchLawyersHubCaseStats();
        setStats(fetchedStats);
      } else if (reality && reality.items.length > 0) {
        const active = reality.items.filter(item => item.status === "in_progress" || item.status === "open").length;
        const completed = reality.items.filter(item => item.status === "closed" || item.verificationStatus === "passed").length;
        const pending = reality.items.filter(item => item.status === "draft" || item.verificationStatus === "pending").length;
        setStats({ active, completed, pending });
      }
    };
    loadStats();
  }, [binding.productId, reality]);

  const discoveryMode = experience?.entry?.discoveryMode;

  // UX-SHELL-001: Use UNIFIED NAVIGATION as single source of truth
  const userCapabilities = session?.userCapabilities || [];
  const navigation: NavigationDescriptor = createWorkspaceNavigation(binding.productId, userCapabilities);
  
  // Extract primary navigation items for shell rendering
  const navItems = navigation.items;
  // Get main navigation items (first 3 for desktop, all in mobile hamburger)
  const primaryNavItems = navItems.slice(0, 3);
  const settingsItem = navItems.find((item: NavigationItem) => item.id === "nav-settings");
  // Map all items to display labels (already in plain text from unified source)
  const getNavigationItemDetails = (item: NavigationItem) => ({
    href: item.href || "/",
    label: item.label,
  });
  
  const tertiaryCta: any = undefined; // Remove all non-spine CTAs permanently

  function calculateRoleStats() {
    return stats;
  }

  const landingSections = buildLandingSectionsFromJourneys(experience);
  const entryQuestion = buildEntryQuestion(experience);
  const entryAnswer = buildEntryAnswer(experience, binding);

  const renderDiscoveryAffordance = () => {
    switch (discoveryMode) {
      case "search": {
        const providerCategories = readServiceProviderCategories(experience);
        const serviceCategories =
          providerCategories.length > 0
            ? providerCategories
            : reality?.items && reality.items.length > 0
              ? [...new Set((reality.items).map((item) => item.displayEyebrow).filter(Boolean))]
              : [];
        return (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-4">Cari Layanan</div>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder={experience?.entry?.searchPlaceholder ?? "Cari kebutuhan layanan yang Anda butuhkan..."}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-500">
                {experience?.entry?.primaryActionLabel ?? "Cari"}
              </button>
            </div>
            <div className="mt-4 flex gap-2 flex-wrap">
              {serviceCategories.length > 0 ? (
                serviceCategories.slice(0, 5).map((category) => (
                  <span key={category} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    {category}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">Belum ada kategori layanan. Silakan tambahkan provider.</span>
              )}
            </div>
            {reality && reality.items.length > 0 && (
              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">Permintaan Layanan Terbaru</div>
                <div className="grid gap-3 md:grid-cols-2">
                  {reality.items.slice(0, 4).map((item) => (
                    <div key={item.requirementId} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-sm font-medium text-slate-800">{item.displayTitle}</div>
                      <div className="text-xs text-slate-600 mt-1">{item.displayEyebrow} • {item.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }
      case "role": {
        const roleStats = calculateRoleStats();
        return (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-blue-50 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Kasus Aktif</div>
              <div className="mt-2 text-3xl font-bold text-blue-900">{roleStats.active}</div>
              <p className="mt-1 text-sm text-blue-700">Masalah hukum yang sedang diproses oleh pengacara</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-green-50 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-green-600">Selesai Bulan Ini</div>
              <div className="mt-2 text-3xl font-bold text-green-900">{roleStats.completed}</div>
              <p className="mt-1 text-sm text-green-700">Kasus hukum yang telah selesai diputuskan</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-purple-50 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">Menunggu Persetujuan</div>
              <div className="mt-2 text-3xl font-bold text-purple-900">{roleStats.pending}</div>
              <p className="mt-1 text-sm text-purple-700">Menunggu persetujuan dari klien</p>
            </div>
          </div>
        );
      }
      case "topic": {
        const topicLabels = readILCTopicLabels(experience);
        const ilcTopics =
          topicLabels.length > 0
            ? topicLabels
            : reality?.items && reality.items.length > 0
              ? [...new Set((reality.items).map((item) => item.displayEyebrow).filter(Boolean))]
              : [];
        return (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-4">{experience?.entry?.primaryActionLabel ?? "Jelajahi Topik"}</div>
            <div className="grid gap-4 md:grid-cols-4">
              {ilcTopics.filter(Boolean).length > 0 ? (
                ilcTopics.filter(Boolean).slice(0, 4).map((topic) => (
                  <Link
                    key={topic}
                    href={`#${String(topic).toLowerCase().replace(/\s+/g, '-')}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center hover:bg-slate-100 transition"
                  >
                    <span className="text-sm font-medium text-slate-800">{topic}</span>
                  </Link>
                ))
              ) : (
                <div className="md:col-span-4 text-center py-6 text-xs text-slate-400 italic">
                  Belum ada topik. Silakan buat topik baru untuk memulai.
                </div>
              )}
            </div>
            {reality && reality.items.length > 0 && (
              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">Konten Terbaru dari Komunitas</div>
                <div className="grid gap-3 md:grid-cols-2">
                  {reality.items.slice(0, 4).map((item) => (
                    <div key={item.requirementId} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-sm font-medium text-slate-800">{item.displayTitle}</div>
                      <div className="text-xs text-slate-600 mt-1">{item.displayEyebrow} • {item.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }
      case "community": {
        return (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-4">
              {binding.productId === "academic" ? "Publikasi Penelitian Terbaru" : "Penelitian & Diskusi Komunitas Terbaru"}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {reality && reality.items.length > 0 ? (
                reality.items.slice(0, 4).map((item) => {
                  const isVerified = item.verificationStatus === "verified" || item.verificationStatus === "passed";
                  return (
                    <div
                      key={item.requirementId}
                      className={`rounded-xl border ${isVerified ? "border-emerald-200 bg-emerald-50" : "border-blue-200 bg-blue-50"} p-4`}
                    >
                      <div className={`text-sm font-semibold ${isVerified ? "text-emerald-900" : "text-blue-900"}`}>
                        {item.displayTitle}
                      </div>
                      <p className={`mt-1 text-xs ${isVerified ? "text-emerald-700" : "text-blue-700"}`}>
                        {item.owner ?? (binding.productId === "academic" ? "Academic Contributor" : "Komunitas Hukum")}
                        {item.displayEyebrow ? ` • ${item.displayEyebrow}` : ""}
                        {item.status ? ` • ${item.status}` : ""}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="md:col-span-2 text-center py-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">Belum Ada Aktivitas</div>
                  <p className="text-xs text-slate-500 italic">
                    {binding.productId === "academic"
                      ? "Belum ada publikasi. Submit artikel penelitian pertama Anda untuk memulai."
                      : "Komunitas ini belum mempublikasikan artikel atau diskusi. Mulai diskusi pertama untuk membangun komunitas."}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <>
      {/* UX-SHELL-001: Responsive App Shell Header - works on desktop/tablet/mobile */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <Link href="/" className="text-lg font-bold text-slate-900">
                EOS Workspace
              </Link>
            </div>

            {/* Desktop Navigation - hidden on mobile */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item: NavigationItem) => (
                <Link
                  key={item.id}
                  href={item.href || "/"}
                  className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Mobile menu button - visible only on mobile */}
            <button
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-700 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu - only visible when open on mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="container mx-auto px-4 py-4 sm:px-6">
              <nav className="flex flex-col gap-4">
                {navItems.map((item: NavigationItem) => (
                  <Link
                    key={item.id}
                    href={item.href || "/"}
                    className="text-base font-medium text-slate-600 transition hover:text-slate-900"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {presentation.categoryLabel}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {binding.displayName}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              {presentation.summary}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="mt-2 text-sm font-medium text-slate-900">
                {presentation.audienceTitle}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {presentation.audienceDescription}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="mt-2 text-sm font-medium text-slate-900">
                {presentation.valueTitle}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {presentation.valueDescription}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="mt-2 text-sm font-medium text-slate-900">
                {presentation.proofTitle}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {presentation.proofDescription}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {/* Render primary navigation items from unified source */}
          {primaryNavItems.map((item: NavigationItem, index: number) => {
            const details = getNavigationItemDetails(item);
            // Primary button for first item, outline for others
            const isPrimary = index === 0;
            return (
              <Link
                key={item.id}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  isPrimary 
                    ? "bg-slate-950 text-white hover:bg-slate-800" 
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                href={details.href}
              >
                {details.label}
              </Link>
            );
          })}
          {/* Settings link - always visible */}
          {settingsItem && (
            <Link
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href={settingsItem.href || "/settings"}
            >
              {settingsItem.label}
            </Link>
          )}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {binding.productId === "lawyershub" && "Akuntabilitas Hukum"}
                {binding.productId === "services-id" && "Transparansi Layanan"}
                {binding.productId === "ilc" && "Verifikasi Pengetahuan"}
                {binding.productId === "academic" && "Integritas Akademik"}
              </div>
              <h2 className="mt-2 text-xl font-bold text-slate-950">
                {presentation.proofTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                {presentation.proofDescription}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {binding.productId === "lawyershub" && "Akuntabilitas Hukum"}
                {binding.productId === "services-id" && "Transparansi Layanan"}
                {binding.productId === "ilc" && "Verifikasi Pengetahuan"}
                {binding.productId === "academic" && "Integritas Akademik"}
              </div>
              <div className="mt-2 font-medium text-slate-900">
                {binding.productId === "lawyershub" && "Bukti hukum dan track record kasus terverifikasi"}
                {binding.productId === "services-id" && "Bukti pengiriman layanan dan review klien"}
                {binding.productId === "ilc" && "Diskusi terverifikasi oleh profesional hukum"}
                {binding.productId === "academic" && "Peer review dan sitasi penelitian terpercaya"}
              </div>
              <div className="mt-1">
                {binding.productId === "lawyershub" && "Platform ini menggunakan progres kasus yang terlihat dan bukti hukum yang terverifikasi, bukan klaim marketing semata."}
                {binding.productId === "services-id" && "Platform ini menggunakan progres layanan yang terlihat dan bukti pengiriman yang terverifikasi, bukan janji kosong."}
                {binding.productId === "ilc" && "Platform ini menggunakan konten yang diverifikasi oleh profesional hukum dan riwayat diskusi yang transparan."}
                {binding.productId === "academic" && "Platform ini menggunakan penelitian yang diverifikasi dan tinjauan sejawat untuk menjaga integritas akademik."}
              </div>
            </div>
          </div>

          <ul className="mt-5 grid gap-3 md:grid-cols-3">
            {presentation.proofBullets.map((bullet) => (
              <li
                key={bullet}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-700"
              >
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        {mode === "landing" ? (
          <div className="mt-6 space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {binding.productId === "lawyershub" && "Mulai Perkara Hukum"}
                {binding.productId === "services-id" && "Ajukan Kebutuhan Layanan"}
                {binding.productId === "ilc" && "Jelajahi Wawasan Hukum"}
                {binding.productId === "academic" && "Telusuri Penelitian"}
              </div>
              <h2 className="mt-2 text-xl font-bold text-slate-950">
                {entryQuestion}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                {entryAnswer}
              </p>
            </section>

            {renderDiscoveryAffordance()}

            <section className="grid gap-4 lg:grid-cols-3">
              {landingSections.map((section) => (
                <article
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                  id={section.id}
                  key={`${binding.productId}-${section.title}`}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {section.eyebrow}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">
                    {section.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {section.description}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </section>
          </div>
        ) : null}
      </section>
      {children}
    </main>
    </>
  );
}

export default ProductPreviewShell;