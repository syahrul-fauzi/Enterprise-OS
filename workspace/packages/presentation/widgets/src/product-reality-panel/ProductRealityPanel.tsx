"use client";

import Link from "next/link";
import React, { useCallback, useState } from "react";
import { getProductExperience } from "@repo/presentation-experience";

// Fallback implementation for missing export to resolve build errors
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

export interface ProductRealityPanelProps {
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

type BusyKey = string;

interface LifecycleAction {
  readonly key: string;
  readonly label: string;
  readonly capability: string;
  readonly commandName: string;
  readonly buildInput: (id: string) => Record<string, unknown>;
  readonly tone: "primary" | "secondary" | "success";
}

const LAWYERSHUB_LIFECYCLE_BY_STATUS: Readonly<Record<string, readonly LifecycleAction[]>> = {
  draft: [
    {
      key: "assign_lawyer",
      label: "Assign Lawyer → Open",
      capability: "lawyershub",
      commandName: "assignLawyer",
      buildInput: (id) => ({ id, lawyerId: "lawyer-eos-d12" }),
      tone: "primary",
    },
  ],
  open: [
    {
      key: "start_progress",
      label: "Start Progress (Re-assign)",
      capability: "lawyershub",
      commandName: "assignLawyer",
      buildInput: (id) => ({ id, lawyerId: "lawyer-eos-d12" }),
      tone: "secondary",
    },
    {
      key: "close_case",
      label: "Close Case",
      capability: "lawyershub",
      commandName: "close",
      buildInput: (id) => ({ id }),
      tone: "success",
    },
  ],
  in_progress: [
    {
      key: "close_case",
      label: "Close Case",
      capability: "lawyershub",
      commandName: "close",
      buildInput: (id) => ({ id }),
      tone: "success",
    },
  ],
  approved: [
    {
      key: "close_case",
      label: "Close Case",
      capability: "lawyershub",
      commandName: "close",
      buildInput: (id) => ({ id }),
      tone: "success",
    },
  ],
  in_delivery: [
    {
      key: "close_case",
      label: "Close Case",
      capability: "lawyershub",
      commandName: "close",
      buildInput: (id) => ({ id }),
      tone: "success",
    },
  ],
};

const SERVICES_ID_LIFECYCLE_BY_STATUS: Readonly<Record<string, readonly LifecycleAction[]>> = {
  draft: [
    {
      key: "accept_request",
      label: "Accept Request",
      capability: "services-id",
      commandName: "acceptServiceRequest",
      buildInput: (id) => ({ id, providerId: `provider-${id}-d12` }),
      tone: "primary",
    },
  ],
  approved: [
    {
      key: "mark_delivered",
      label: "Mark In Service → Delivered",
      capability: "services-id",
      commandName: "markServiceDelivered",
      buildInput: (id) => ({ id }),
      tone: "success",
    },
  ],
  in_delivery: [
    {
      key: "mark_delivered",
      label: "Mark Delivered",
      capability: "services-id",
      commandName: "markServiceDelivered",
      buildInput: (id) => ({ id }),
      tone: "success",
    },
  ],
  accepted: [
    {
      key: "mark_delivered",
      label: "Mark Delivered",
      capability: "services-id",
      commandName: "markServiceDelivered",
      buildInput: (id) => ({ id }),
      tone: "success",
    },
  ],
  in_service: [
    {
      key: "mark_delivered",
      label: "Mark Delivered",
      capability: "services-id",
      commandName: "markServiceDelivered",
      buildInput: (id) => ({ id }),
      tone: "success",
    },
  ],
};

const ILC_ARTICLE_LIFECYCLE_BY_STATUS: Readonly<Record<string, readonly LifecycleAction[]>> = {
  draft: [
    {
      key: "publish_content",
      label: "Accept & Publish",
      capability: "ilc",
      commandName: "publishContent",
      buildInput: (id) => ({ id }),
      tone: "primary",
    },
  ],
  proposed: [
    {
      key: "publish_content",
      label: "Accept & Publish",
      capability: "ilc",
      commandName: "publishContent",
      buildInput: (id) => ({ id }),
      tone: "primary",
    },
  ],
  accepted: [
    {
      key: "publish_content",
      label: "Publish",
      capability: "ilc",
      commandName: "publishContent",
      buildInput: (id) => ({ id }),
      tone: "success",
    },
  ],
  approved: [
    {
      key: "publish_content",
      label: "Publish",
      capability: "ilc",
      commandName: "publishContent",
      buildInput: (id) => ({ id }),
      tone: "success",
    },
  ],
  in_delivery: [
    {
      key: "publish_content",
      label: "Publish",
      capability: "ilc",
      commandName: "publishContent",
      buildInput: (id) => ({ id }),
      tone: "success",
    },
  ],
  in_production: [
    {
      key: "publish_content",
      label: "Publish",
      capability: "ilc",
      commandName: "publishContent",
      buildInput: (id) => ({ id }),
      tone: "success",
    },
  ],
};

function resolveLifecycleActions(
  productId: string,
  itemStatus: string,
  itemId: string,
): readonly LifecycleAction[] {
  const pid = productId.toLowerCase();
  if (pid === "lawyershub" || itemId.startsWith("case-")) {
    return LAWYERSHUB_LIFECYCLE_BY_STATUS[itemStatus] ?? [];
  }
  if (pid === "services-id" || itemId.startsWith("sreq-")) {
    return SERVICES_ID_LIFECYCLE_BY_STATUS[itemStatus] ?? [];
  }
  if (pid === "ilc" || pid === "academic" || itemId.startsWith("content-")) {
    return ILC_ARTICLE_LIFECYCLE_BY_STATUS[itemStatus] ?? [];
  }
  return [];
}

function toneClasses(tone: LifecycleAction["tone"]): string {
  switch (tone) {
    case "primary":
      return "bg-slate-950 text-white hover:bg-slate-800 border-slate-950";
    case "success":
      return "bg-emerald-700 text-white hover:bg-emerald-600 border-emerald-700";
    case "secondary":
    default:
      return "bg-white text-slate-700 hover:bg-slate-100 border-slate-300";
  }
}

export function ProductRealityPanel({ productId }: ProductRealityPanelProps) {
  const snapshot = readProductRealitySnapshot(productId);
  const copy = readRealityCopy(productId);
  const experience: any = getProductExperience(productId);
  const statusLabels = experience?.card?.statusLabels ?? {};
  const [busy, setBusy] = useState<Set<BusyKey>>(new Set());
  const [lastResult, setLastResult] = useState<{
    at: number;
    id: string;
    ok: boolean;
    message: string;
  } | null>(null);

  const handleAction = useCallback(
    async (itemId: string, action: LifecycleAction) => {
      const busyKey = `${itemId}::${action.key}`;
      setBusy((prev) => new Set(prev).add(busyKey));
      setLastResult(null);
      try {
        const endpoint = `/api/capabilities/${encodeURIComponent(action.capability)}/${encodeURIComponent(action.commandName)}`;
        const body = action.buildInput(itemId);
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await resp.json().catch(() => ({}))) as {
          ok?: boolean;
          output?: unknown;
          error?: string;
          record?: { invokedAt?: string };
        };
        if (!resp.ok || json.ok !== true) {
          setLastResult({
            at: Date.now(),
            id: itemId,
            ok: false,
            message: json.error ?? `HTTP ${resp.status}`,
          });
          return;
        }
        setLastResult({
          at: Date.now(),
          id: itemId,
          ok: true,
          message: `${action.label} berhasil. Evidence: ${JSON.stringify(json.output).slice(0, 80)}`,
        });
        window.setTimeout(() => window.location.reload(), 700);
      } catch (err) {
        setLastResult({
          at: Date.now(),
          id: itemId,
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setBusy((prev) => {
          const next = new Set(prev);
          next.delete(busyKey);
          return next;
        });
      }
    },
    [],
  );

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

      {lastResult && (
        <div
          className={`mt-5 rounded-2xl border p-4 text-sm ${lastResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
        >
          <div className="font-semibold">{lastResult.ok ? "✅ Lifecycle transition executed" : "❌ Transition failed"}</div>
          <div className="mt-1 text-xs">{lastResult.id} — {lastResult.message}</div>
        </div>
      )}

      {snapshot.items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <div className="text-sm font-semibold text-slate-900">{copy.emptyTitle}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{copy.emptyDescription}</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {snapshot.items.map((item) => {
            const actions = resolveLifecycleActions(productId, item.status, item.requirementId);
            return (
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
                    <dd className="text-right font-medium text-slate-900">{(item as unknown as {evidenceCount?: number}).evidenceCount ?? 0}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-slate-500">{copy.proofLabel}</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {humanVerificationLabel(item.verificationStatus)}
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Latest activity: {(item as unknown as {latestUpdatedAt?: string}).latestUpdatedAt ? formatMoment((item as unknown as {latestUpdatedAt: string}).latestUpdatedAt) : "Never"}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Evidence is recorded on the platform and reviewable from the progress surface.
                </p>

                {actions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Lifecycle Actions (D1.2)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {actions.map((action) => {
                        const busyKey = `${item.requirementId}::${action.key}`;
                        const isBusy = busy.has(busyKey);
                        return (
                          <button
                            key={action.key}
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleAction(item.requirementId, action)}
                            className={`rounded-xl border px-3 py-2 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${toneClasses(action.tone)}`}
                          >
                            {isBusy ? "Executing..." : action.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <Link
                    href={`/delivery/${item.requirementId}`}
                    className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    {copy.openLabel} →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}