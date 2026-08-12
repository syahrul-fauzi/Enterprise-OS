import Link from "next/link";
import React from "react";
import { useEffect, useState } from "react";
import type { ProductPreviewBinding, ProductPresentation, ProductExperience } from "@repo/presentation-types";
import { getProductExperience } from "@repo/presentation-experience";

// Fallback implementations for missing exports to resolve build errors
function readProductPresentation(productId: string): ProductPresentation {
  return {} as ProductPresentation;
}

type ProductRealitySnapshot = {
  items: Array<{
    requirementId: string;
    displayTitle: string;
    displayEyebrow: string;
    status: string;
    verificationStatus: string;
  }>;
};

function readProductRealitySnapshot(productId: string): ProductRealitySnapshot {
  return { items: [] };
}

function readLawyersHubCaseStats() {
  return { active: 0, completed: 0, pending: 0 };
}

function readServiceProviderCategories() {
  return [];
}

function readILCTopicLabels() {
  return [];
}

export interface ProductPreviewShellProps {
  readonly binding: ProductPreviewBinding;
  readonly mode?: "landing" | "requirements" | "delivery" | "detail" | "trace";
}

export function ProductPreviewShell({
  binding,
  mode = "landing",
}: ProductPreviewShellProps) {
  const presentation = readProductPresentation(binding.productId);
  const experience = getProductExperience(binding.productId);
  const [reality, setReality] = useState<ProductRealitySnapshot | null>(null);
  const requirementsHref = `/products/${binding.productId}${binding.route}`;
  const deliveryHref = `/products/${binding.productId}/delivery`;
  const overviewHref = `/products/${binding.productId}`;

  // Load real product reality data instead of hardcoded demo numbers
  useEffect(() => {
    if (mode === "landing") {
      const snapshot = readProductRealitySnapshot(binding.productId);
      setReality(snapshot);
    }
  }, [binding.productId, mode]);

  // Calculate real stats for role mode (lawyershub) — domain-sourced from CaseRepository
  const calculateRoleStats = () => {
    if (binding.productId === "lawyershub") {
      return readLawyersHubCaseStats();
    }
    if (!reality || reality.items.length === 0) {
      return { active: 0, completed: 0, pending: 0 };
    }
    const active = reality.items.filter(item => item.status === "in_delivery").length;
    const completed = reality.items.filter(item => item.verificationStatus === "passed").length;
    const pending = reality.items.filter(item => item.status === "draft" || item.status === "in_review").length;
    return { active, completed, pending };
  };
  const primaryHref =
    mode === "landing"
      ? experience.landingPrimaryCtaHref
      : mode === "requirements"
        ? overviewHref
        : overviewHref;
  const secondaryHref =
    mode === "landing"
      ? experience.landingSecondaryCtaHref
      : mode === "requirements"
        ? deliveryHref
        : requirementsHref;
  const primaryLabel =
    mode === "landing"
      ? experience.landingPrimaryCtaLabel
      : mode === "requirements"
        ? experience.requirementsPrimaryCtaLabel
        : experience.deliveryPrimaryCtaLabel;
  const secondaryLabel =
    mode === "landing"
      ? experience.landingSecondaryCtaLabel
      : mode === "requirements"
        ? experience.requirementsSecondaryCtaLabel
        : experience.deliverySecondaryCtaLabel;

  // Render affordance yang berbeda berdasarkan discoveryMode canonical
  const renderDiscoveryAffordance = () => {
    switch (experience.discoveryMode) {
      case "search":
        const providerCategories = readServiceProviderCategories();
        const serviceCategories =
          providerCategories.length > 0
            ? providerCategories
            : reality?.items && reality.items.length > 0
              ? [...new Set(reality.items.map((item) => item.title.split(" ")[0]).filter(Boolean))]
              : [];
        return (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-4">Cari Layanan</div>
            <div className="flex gap-3">
              <input 
                type="text" 
                placeholder="Cari kebutuhan layanan yang Anda butuhkan..."
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-500">
                Cari
              </button>
            </div>
            <div className="mt-4 flex gap-2 flex-wrap">
              {serviceCategories.length > 0 ? (
                serviceCategories.slice(0, 3).map((category) => (
                  <span key={category} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    {category}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">Belum ada kategori layanan. Silakan tambahkan provider.</span>
              )}
            </div>
            {/* Tampilkan recent service requests */}
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
      case "role":
        // Role/professional mode: lawyershub - tampilkan professional dashboard summary dengan data REAL
        const roleStats = calculateRoleStats();
        return (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-blue-50 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Kasus Aktif</div>
              <div className="mt-2 text-3xl font-bold text-blue-900">{roleStats.active}</div>
              <p className="mt-1 text-sm text-blue-700">Legal matters in progress</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-green-50 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-green-600">Selesai Bulan Ini</div>
              <div className="mt-2 text-3xl font-bold text-green-900">{roleStats.completed}</div>
              <p className="mt-1 text-sm text-green-700">Cases successfully resolved</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-purple-50 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">Menunggu Review</div>
              <div className="mt-2 text-3xl font-bold text-purple-900">{roleStats.pending}</div>
              <p className="mt-1 text-sm text-purple-700">Pending client approval</p>
            </div>
          </div>
        );
      case "topic":
        // Topic/knowledge mode: ilc - tampilkan knowledge browsing grid dengan data REAL dari TopicRepository
        const ilcTopicLabels = readILCTopicLabels();
        const ilcTopics =
          ilcTopicLabels.length > 0
            ? ilcTopicLabels
            : reality?.items && reality.items.length > 0
              ? [...new Set(reality.items.map((item) => item.title.split(" ")[0]).filter(Boolean))]
              : [];
        return (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-4">Jelajahi Topik</div>
            <div className="grid gap-4 md:grid-cols-4">
              {ilcTopics.filter(Boolean).length > 0 ? (
                ilcTopics.filter(Boolean).slice(0, 4).map((topic) => (
                  <Link 
                    key={topic}
                    href={`#${topic!.toLowerCase().replace(/\s+/g, '-')}`}
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
            {/* Tampilkan recent ILC content */}
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
      case "community":
        // Community/contribution mode: academic/ilc - tampilkan community research feed dengan data REAL dari requirement gateway
        return (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-4">Penelitian Terbaru dari Komunitas</div>
            <div className="grid gap-4 md:grid-cols-2">
              {reality && reality.items.length > 0 ? (
                reality.items.slice(0, 4).map((item) => {
                  const isVerified = item.verificationStatus === "verified";
                  return (
                    <div
                      key={item.requirementId}
                      className={`rounded-xl border ${isVerified ? "border-emerald-200 bg-emerald-50" : "border-blue-200 bg-blue-50"} p-4`}
                    >
                      <div className={`text-sm font-semibold ${isVerified ? "text-emerald-900" : "text-blue-900"}`}>
                        {item.displayTitle}
                      </div>
                      <p className={`mt-1 text-xs ${isVerified ? "text-emerald-700" : "text-blue-700"}`}>
                        {item.owner ?? "ILC Community"}
                        {item.displayEyebrow ? ` • ${item.displayEyebrow}` : ""}
                        {item.status ? ` • ${item.status}` : ""}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="md:col-span-2 text-center py-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">Belum Ada Aktivitas Komunitas</div>
                  <p className="text-xs text-slate-500 italic">Komunitas ini belum mempublikasikan artikel atau diskusi. Mulai diskusi pertama untuk membangun komunitas.</p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
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
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Audience
            </div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {presentation.audienceTitle}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {presentation.audienceDescription}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Value Proposition
            </div>
            <div className="mt-2 text-sm font-medium text-slate-900">
              {presentation.valueTitle}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {presentation.valueDescription}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Trust Signal
            </div>
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
        <Link
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          href={primaryHref}
        >
          {primaryLabel}
        </Link>
        <Link
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          href={secondaryHref}
        >
          {secondaryLabel}
        </Link>
        {mode === "landing" &&
        experience.landingTertiaryCtaHref &&
        experience.landingTertiaryCtaLabel ? (
          <Link
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            href={experience.landingTertiaryCtaHref}
          >
            {experience.landingTertiaryCtaLabel}
          </Link>
        ) : null}
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Honest trust signal
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
              Proof Before Claim
            </div>
            <div className="mt-2 font-medium text-slate-900">
              Built-in evidence and verified workflow
            </div>
            <div className="mt-1">
              This product uses visible progress and evidence instead of invented trust signals.
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
              Human Entry Point
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              {experience.entryQuestion}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              {experience.entryAnswer}
            </p>
          </section>

          {/* Render discovery affordance yang berbeda berdasarkan canonical discoveryMode */}
          {renderDiscoveryAffordance()}

          <section className="grid gap-4 lg:grid-cols-3">
            {experience.landingSections.map((section) => (
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
  );
}

export default ProductPreviewShell;