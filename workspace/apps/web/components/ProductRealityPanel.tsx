import Link from "next/link";
import React from "react";
import { readProductExperience } from "../lib/product-experience";
import { readProductRealitySnapshot } from "../lib/product-reality";

interface ProductRealityPanelProps {
  readonly productId: string;
}

interface ProductRealityCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly emptyTitle: string;
  readonly emptyDescription: string;
  readonly statusLabel: string;
  readonly evidenceLabel: string;
  readonly proofLabel: string;
  readonly openLabel: string;
}

const PRODUCT_REALITY_COPY: Record<string, ProductRealityCopy> = {
  "services-id": {
    eyebrow: "Real Activity",
    title: "Real service work moving through the platform",
    description:
      "These are real service requests with delivery evidence and visible progress. This is trust from activity, not invented testimonials.",
    emptyTitle: "No real service activity is visible yet.",
    emptyDescription:
      "The surface is live, but there is not enough evidence-backed service activity on this product surface to display here yet.",
    statusLabel: "Delivery status",
    evidenceLabel: "Delivery evidence",
    proofLabel: "Verified outcome",
    openLabel: "Open service progress",
  },
  lawyershub: {
    eyebrow: "Real Activity",
    title: "Real legal matters with visible accountability",
    description:
      "These are real legal work records with supporting evidence and visible progress. Trust comes from accountable activity, not empty legal-tech claims.",
    emptyTitle: "No real legal activity is visible yet.",
    emptyDescription:
      "The surface is live, but there is not enough evidence-backed legal activity on this product surface to display here yet.",
    statusLabel: "Matter status",
    evidenceLabel: "Supporting records",
    proofLabel: "Trust check",
    openLabel: "Open legal progress",
  },
  ilc: {
    eyebrow: "Real Activity",
    title: "Real community and editorial activity on the platform",
    description:
      "These are real topic and program records with participation or publication evidence. Trust comes from visible activity, not fake community metrics.",
    emptyTitle: "No real community activity is visible yet.",
    emptyDescription:
      "The surface is live, but there is not enough evidence-backed ILC activity on this product surface to display here yet.",
    statusLabel: "Program status",
    evidenceLabel: "Evidence records",
    proofLabel: "Evidence check",
    openLabel: "Open community progress",
  },
};

function readRealityCopy(productId: string): ProductRealityCopy {
  return PRODUCT_REALITY_COPY[productId] ?? {
    eyebrow: "Real Activity",
    title: "Real workflow activity",
    description:
      "These records come from real platform activity rather than synthetic claims or placeholder trust signals.",
    emptyTitle: "No real activity is visible yet.",
    emptyDescription: "The product is live, but there is not enough evidence-backed activity to display here yet.",
    statusLabel: "Status",
    evidenceLabel: "Evidence",
    proofLabel: "Outcome",
    openLabel: "Open progress",
  };
}

function formatMoment(value: string | null): string {
  if (!value) {
    return "No recent update yet";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function humanVerificationLabel(value: string): string {
  if (value === "passed") {
    return "Verified";
  }

  if (value === "pending") {
    return "In review";
  }

  if (value === "failed") {
    return "Needs attention";
  }

  return "Not ready";
}

export function ProductRealityPanel({ productId }: ProductRealityPanelProps) {
  const snapshot = readProductRealitySnapshot(productId);
  const copy = readRealityCopy(productId);
  const experience = readProductExperience(productId);
  const statusLabels = experience.card.statusLabels;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {copy.eyebrow}
        </div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          {copy.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          {copy.description}
        </p>
      </div>

      {snapshot.items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <div className="text-sm font-semibold text-slate-900">{copy.emptyTitle}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{copy.emptyDescription}</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {snapshot.items.map((item) => (
            <article
              className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
              key={`${productId}-${item.requirementId}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {item.displayEyebrow}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">
                    {item.displayTitle}
                  </h3>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                  {statusLabels[item.status] ?? item.status}
                </span>
              </div>

              <dl className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">{copy.statusLabel}</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {statusLabels[item.status] ?? item.status}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">{copy.evidenceLabel}</dt>
                  <dd className="text-right font-medium text-slate-900">{item.evidenceCount}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">{copy.proofLabel}</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {humanVerificationLabel(item.verificationStatus)}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Latest activity: {formatMoment(item.latestUpdatedAt)}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Evidence is recorded on the platform and reviewable from the progress surface.
              </p>

              <div className="mt-4">
                <Link
                  className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  href={`/products/${productId}/delivery?requirementId=${item.requirementId}`}
                >
                  {copy.openLabel}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ProductRealityPanel;
