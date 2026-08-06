"use client";

import React, { useEffect, useMemo, useState } from "react";
import type {
  RequirementAggregate,
  RequirementPriority,
  RequirementStatus,
  RequirementVerificationStatus,
} from "../../implementation/contracts";
import {
  RequirementCard,
  type RequirementAction,
} from "../components/RequirementCard";

type StatusFilter = RequirementStatus | "all";
type PriorityFilter = RequirementPriority | "all";
type VerificationFilter = RequirementVerificationStatus | "all";

interface RequirementSearchResponse {
  readonly items: readonly RequirementAggregate[];
  readonly total: number;
  readonly matched: number;
  readonly limit: number;
  readonly offset: number;
}

export interface RequirementWorkspaceProps {
  readonly productId?: string;
  readonly copy?: RequirementWorkspaceCopy;
  readonly cardCopy?: RequirementCardCopy;
}

export interface RequirementCardCopy {
  readonly verificationLabel: string;
  readonly ownerLabel: string;
  readonly successLabel: string;
  readonly referenceLabel: string;
  readonly readyLabel: string;
  readonly statusLabels: Partial<Record<string, string>>;
  readonly actionLabels: Partial<Record<string, string>>;
  readonly showCapabilityIds: boolean;
}

export interface RequirementWorkspaceCopy {
  readonly badgeLabel: string;
  readonly title: string;
  readonly description: string;
  readonly titleLabel: string;
  readonly titlePlaceholder: string;
  readonly ownerLabel: string;
  readonly ownerPlaceholder: string;
  readonly summaryLabel: string;
  readonly summaryPlaceholder: string;
  readonly successLabel: string;
  readonly successPlaceholder: string;
  readonly createHelper: string;
  readonly updateHelper: string;
  readonly createLabel: string;
  readonly updateLabel: string;
  readonly searchPlaceholder: string;
  readonly emptyTitle: string;
  readonly emptyDescription: string;
  readonly totalLabel: string;
  readonly matchedLabel: string;
  readonly verifiedLabel: string;
  readonly activeLabel: string;
  readonly capabilityIds: readonly string[];
  readonly defaultSuccessCriteria: readonly string[];
}

const STATUS_OPTIONS: readonly StatusFilter[] = [
  "all",
  "draft",
  "approved",
  "in_delivery",
  "implemented",
  "verified",
] as const;

const PRIORITY_OPTIONS: readonly PriorityFilter[] = [
  "all",
  "low",
  "medium",
  "high",
  "critical",
] as const;

const VERIFICATION_OPTIONS: readonly VerificationFilter[] = [
  "all",
  "not_ready",
  "pending",
  "passed",
  "failed",
  "unknown",
] as const;

const DEFAULT_LINKED_CAPABILITIES = "EOS-001";
const DEFAULT_ACCEPTANCE_CRITERIA =
  "Requirement is searchable\nRequirement has owner\nRequirement links capabilities";

const DEFAULT_WORKSPACE_COPY: RequirementWorkspaceCopy = {
  badgeLabel: "Requirement Intake",
  title: "Create the next requirement clearly and move it forward.",
  description:
    "Capture the request, assign an owner, define success criteria, and keep the team aligned from draft through verification.",
  titleLabel: "Title",
  titlePlaceholder: "What needs to be delivered?",
  ownerLabel: "Owner",
  ownerPlaceholder: "Who owns this requirement?",
  summaryLabel: "Summary",
  summaryPlaceholder: "Brief summary for reviewers and delivery teams",
  successLabel: "What should success look like?",
  successPlaceholder: "Describe the outcomes that prove this requirement is ready",
  createHelper:
    "Start with the clearest version of the requirement. You can refine and advance it after review.",
  updateHelper:
    "Update the requirement details, then continue the lifecycle from the latest state.",
  createLabel: "Create Requirement",
  updateLabel: "Update Requirement",
  searchPlaceholder: "Search by title, summary, owner, or capability",
  emptyTitle: "No requirements match the current view.",
  emptyDescription: "Clear the filters or create a new requirement to start tracking work.",
  totalLabel: "Total",
  matchedLabel: "Matched",
  verifiedLabel: "Verified",
  activeLabel: "In Progress",
  capabilityIds: ["EOS-001"],
  defaultSuccessCriteria: [
    "Requirement is searchable",
    "Requirement has owner",
    "Requirement links capabilities",
  ],
};

const DEFAULT_CARD_COPY: RequirementCardCopy = {
  verificationLabel: "Verification",
  ownerLabel: "Owner",
  successLabel: "Acceptance Criteria",
  referenceLabel: "Reference",
  readyLabel: "Ready to present",
  statusLabels: {},
  actionLabels: {},
  showCapabilityIds: true,
};

function optionLabel(value: string): string {
  return value === "all"
    ? "All"
    : value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

async function readRequirements(params: {
  readonly query: string;
  readonly status: StatusFilter;
  readonly priority: PriorityFilter;
  readonly verificationStatus: VerificationFilter;
}): Promise<RequirementSearchResponse> {
  const search = new URLSearchParams();
  if (params.query.trim()) search.set("q", params.query.trim());
  if (params.status !== "all") search.set("status", params.status);
  if (params.priority !== "all") search.set("priority", params.priority);
  if (params.verificationStatus !== "all") {
    search.set("verificationStatus", params.verificationStatus);
  }

  const response = await fetch(`/api/requirements?${search.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to load requirements (${response.status})`);
  }
  return (await response.json()) as RequirementSearchResponse;
}

export function RequirementWorkspace({
  productId,
  copy = DEFAULT_WORKSPACE_COPY,
  cardCopy = DEFAULT_CARD_COPY,
}: RequirementWorkspaceProps) {
  const [requirements, setRequirements] = useState<readonly RequirementAggregate[]>([]);
  const [total, setTotal] = useState(0);
  const [matched, setMatched] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [verificationFilter, setVerificationFilter] =
    useState<VerificationFilter>("all");

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [owner, setOwner] = useState("");
  const [priority, setPriority] = useState<RequirementPriority>("medium");
  const [linkedCapabilities, setLinkedCapabilities] = useState(
    copy.capabilityIds.join(", ") || DEFAULT_LINKED_CAPABILITIES,
  );
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(
    copy.defaultSuccessCriteria.join("\n") || DEFAULT_ACCEPTANCE_CRITERIA,
  );
  const [editingRequirementId, setEditingRequirementId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useMemo(
    () => async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await readRequirements({
          query,
          status: statusFilter,
          priority: priorityFilter,
          verificationStatus: verificationFilter,
        });
        setRequirements(result.items);
        setTotal(result.total);
        setMatched(result.matched);
      } catch (raw) {
        const next = raw instanceof Error ? raw.message : String(raw);
        setError(next);
      } finally {
        setLoading(false);
      }
    },
    [priorityFilter, query, statusFilter, verificationFilter],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function resetForm() {
    setTitle("");
    setSummary("");
    setOwner("");
    setPriority("medium");
    setLinkedCapabilities(copy.capabilityIds.join(", ") || DEFAULT_LINKED_CAPABILITIES);
    setAcceptanceCriteria(copy.defaultSuccessCriteria.join("\n") || DEFAULT_ACCEPTANCE_CRITERIA);
    setEditingRequirementId(null);
  }

  function handleEdit(item: RequirementAggregate) {
    setEditingRequirementId(item.id);
    setTitle(item.title);
    setSummary(item.summary ?? "");
    setOwner(item.owner ?? "");
    setPriority(item.priority);
    setLinkedCapabilities(item.linkedCapabilityIds.join(", "));
    setAcceptanceCriteria(item.acceptanceCriteria.join("\n"));
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        editingRequirementId ? `/api/requirements/${editingRequirementId}` : "/api/requirements",
        {
          method: editingRequirementId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingRequirementId
              ? {
                  action: "update",
                  title,
                  summary,
                  owner,
                  priority,
                  linkedCapabilityIds: linkedCapabilities
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                  acceptanceCriteria: acceptanceCriteria
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean),
                }
              : {
                  title,
                  summary,
                  owner,
                  priority,
                  linkedCapabilityIds: linkedCapabilities
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                  acceptanceCriteria: acceptanceCriteria
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean),
                },
          ),
        },
      );
      if (!response.ok) {
        const payload = (await response.json()) as {
          readonly error?: string;
          readonly detail?: string;
        };
        throw new Error(
          payload.detail ??
            payload.error ??
            (editingRequirementId ? "Failed to update requirement" : "Failed to create requirement"),
        );
      }
      resetForm();
      await refresh();
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : String(raw));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAction(id: string, action: RequirementAction) {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/requirements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as {
          readonly error?: string;
          readonly detail?: string;
        };
        throw new Error(payload.detail ?? payload.error ?? "Requirement action failed");
      }
      await refresh();
      if (action === "start_delivery" && productId) {
        window.location.assign(`/products/${productId}/delivery?requirementId=${id}`);
      }
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : String(raw));
    } finally {
      setBusyId(null);
    }
  }

  const verifiedCount = requirements.filter((item) => item.status === "verified").length;
  const activeCount = requirements.filter((item) => item.status !== "verified").length;

  return (
    <div className="space-y-6">
      <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {copy.badgeLabel}
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {copy.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {copy.description}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              {copy.totalLabel}: {total}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              {copy.matchedLabel}: {matched}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              {copy.verifiedLabel}: {verifiedCount}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              {copy.activeLabel}: {activeCount}
            </div>
          </div>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-900">{copy.titleLabel}</span>
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              onChange={(event) => setTitle(event.target.value)}
              placeholder={copy.titlePlaceholder}
              value={title}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-900">{copy.ownerLabel}</span>
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              onChange={(event) => setOwner(event.target.value)}
              placeholder={copy.ownerPlaceholder}
              value={owner}
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-900">{copy.summaryLabel}</span>
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              onChange={(event) => setSummary(event.target.value)}
              placeholder={copy.summaryPlaceholder}
              value={summary}
            />
          </label>
          <select
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            onChange={(event) => setPriority(event.target.value as RequirementPriority)}
            value={priority}
          >
            {PRIORITY_OPTIONS.filter((item) => item !== "all").map((item) => (
              <option key={item} value={item}>
                {optionLabel(item)}
              </option>
            ))}
          </select>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-900">{copy.successLabel}</span>
            <textarea
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              onChange={(event) => setAcceptanceCriteria(event.target.value)}
              placeholder={copy.successPlaceholder}
              rows={4}
              value={acceptanceCriteria}
            />
          </label>
          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {editingRequirementId
                ? copy.updateHelper
                : copy.createHelper}
            </p>
            <div className="flex items-center gap-3">
              {editingRequirementId ? (
                <button
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
                  onClick={resetForm}
                  type="button"
                >
                  Cancel Edit
                </button>
              ) : null}
              <button
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                disabled={submitting || title.trim().length === 0}
                type="submit"
              >
                {submitting
                  ? editingRequirementId
                    ? "Updating..."
                    : "Creating..."
                  : editingRequirementId
                    ? copy.updateLabel
                    : copy.createLabel}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <input
            aria-label={copy.searchPlaceholder}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:max-w-sm"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchPlaceholder}
            value={query}
          />
          <div className="flex flex-wrap gap-1">
            {STATUS_OPTIONS.map((item) => (
              <button
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  statusFilter === item
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
                key={item}
                onClick={() => setStatusFilter(item)}
                type="button"
              >
                {optionLabel(item)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {PRIORITY_OPTIONS.map((item) => (
              <button
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  priorityFilter === item
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
                key={item}
                onClick={() => setPriorityFilter(item)}
                type="button"
              >
                {optionLabel(item)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {VERIFICATION_OPTIONS.map((item) => (
              <button
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  verificationFilter === item
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
                key={item}
                onClick={() => setVerificationFilter(item)}
                type="button"
              >
                {optionLabel(item)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="font-semibold">Something needs attention</div>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-sm text-slate-500">
            Loading the latest workflow...
          </div>
        ) : requirements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">{copy.emptyTitle}</div>
            <p className="mt-2">{copy.emptyDescription}</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {requirements.map((item) => (
              <RequirementCard
                busy={busyId === item.id}
                copy={cardCopy}
                item={item}
                key={item.id}
                productId={productId ?? "default-product"}
                onAction={handleAction}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default RequirementWorkspace;